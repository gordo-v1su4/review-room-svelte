import { test, expect } from 'bun:test';
import { S3Client } from '@aws-sdk/client-s3';
import { internal } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { automationUpload, call, completeProcessing, cspDigest, seriesFixture } from './series-api-helpers';
import { READ_URL_TTL_SECONDS, signVersionMedia } from '../src/lib/server/signed-read';
import { automationError } from '../src/lib/server/automation-http';

type F = Awaited<ReturnType<typeof seriesFixture>>;
const firstVersion = async (f: F, assetId: Id<'videos'>) => (await f.t.run(ctx => ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId)).collect()))[0];

async function readyTake() {
  const f = await seriesFixture();
  const { assetId } = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  await completeProcessing(f, assetId);
  return { ...f, assetId, version: await firstVersion(f, assetId) };
}

test('a ready version returns its storage keys to the server for signing, and the read is audited', async () => {
  const f = await readyTake();
  const media = await f.t.mutation(internal.automation.versionMedia, { keyDigest: cspDigest, versionId: f.version._id });
  expect(media).toEqual({ versionId: f.version._id, assetId: f.assetId, originalKey: f.version.originalKey, posterKey: f.version.posterKey!, mimeType: 'video/mp4', sizeBytes: 100 });
  const audit = await f.t.run(ctx => ctx.db.query('automationAudit').collect());
  expect(audit.some(entry => entry.action === 'media:read' && entry.targetId === f.version._id)).toBe(true);
});

test('media:read is required', async () => {
  const f = await readyTake();
  const writer = 'f'.repeat(64);
  await f.t.mutation(internal.automation.issue, { name: 'Writer only', keyDigest: writer, projectId: f.project, actions: ['folders:write'] });
  await expect(f.t.mutation(internal.automation.versionMedia, { keyDigest: writer, versionId: f.version._id })).rejects.toThrow('Automation scope denied');
});

test('a credential restricted to another project cannot read this version', async () => {
  const f = await readyTake();
  const other = await f.t.run(ctx => ctx.db.insert('projects', { title: 'Other series', slug: 'other', createdBy: f.owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false }));
  const outsider = '0'.repeat(64);
  await f.t.mutation(internal.automation.issue, { name: 'Other series', keyDigest: outsider, projectId: other, actions: ['media:read'] });
  await expect(f.t.mutation(internal.automation.versionMedia, { keyDigest: outsider, versionId: f.version._id })).rejects.toThrow('Automation scope denied');
});

test('archived assets are unavailable and unready versions are a conflict, with clear messages', async () => {
  const f = await readyTake();
  const { assetId: processing } = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0030' });
  const notReady = f.t.mutation(internal.automation.versionMedia, { keyDigest: cspDigest, versionId: (await firstVersion(f, processing))._id });
  await expect(notReady).rejects.toThrow('Version not ready: processing is processing');
  const notReadyResponse = automationError(await notReady.catch(cause => cause));
  expect(notReadyResponse.status).toBe(409);
  expect((await notReadyResponse.json()).error).toBe('Version not ready: processing is processing');

  await f.t.run(ctx => ctx.db.patch(f.assetId, { status: 'archived' }));
  const archived = await f.t.mutation(internal.automation.versionMedia, { keyDigest: cspDigest, versionId: f.version._id }).catch(cause => cause);
  const archivedResponse = automationError(archived);
  expect(archivedResponse.status).toBe(404);
  expect((await archivedResponse.json()).error).toBe('Version unavailable: its asset is archived');
  // Other credentials' project restriction maps to 403.
  expect(automationError(new Error('Automation scope denied')).status).toBe(403);
});

test('signed URLs are GET links that expire after the short read window', async () => {
  const client = new S3Client({ endpoint: 'https://s3.example.invalid', region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: 'test', secretAccessKey: 'test' } });
  const now = Date.UTC(2026, 9, 17, 12, 0, 0);
  const signed = await signVersionMedia(client, 'bucket', { originalKey: 'assets/p/videos/x/original.mp4', posterKey: 'assets/p/videos/x/poster.jpg', mimeType: 'video/mp4', sizeBytes: 100 }, now);
  expect(signed.original).toMatchObject({ mimeType: 'video/mp4', sizeBytes: 100, expiresAt: now + READ_URL_TTL_SECONDS * 1000 });
  const original = new URL(signed.original.url);
  expect(original.pathname).toBe('/bucket/assets/p/videos/x/original.mp4');
  expect(original.searchParams.get('X-Amz-Expires')).toBe(String(READ_URL_TTL_SECONDS));
  expect(original.searchParams.get('X-Amz-Date')).toBe('20261017T120000Z');
  expect(original.searchParams.get('response-content-type')).toBe('video/mp4');
  expect(new URL(signed.poster!.url).searchParams.get('response-content-type')).toBe('image/jpeg');
  expect(READ_URL_TTL_SECONDS).toBeLessThanOrEqual(15 * 60);
  const noPoster = await signVersionMedia(client, 'bucket', { originalKey: 'assets/p/images/x/original.png', posterKey: null, mimeType: 'image/png', sizeBytes: 5 }, now);
  expect(noPoster.poster).toBeNull();
});
