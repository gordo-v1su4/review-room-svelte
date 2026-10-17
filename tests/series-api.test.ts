import { test, expect } from 'bun:test';
import { internal } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { automationUpload, call, cspDigest, seriesFixture } from './series-api-helpers';

const versionsOf = (f: Awaited<ReturnType<typeof seriesFixture>>, assetId: Id<'videos'>) =>
  f.t.run(ctx => ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId)).collect());

test('uploading by code into the same folder adds the next take to the existing shot', async () => {
  const f = await seriesFixture();
  const first = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  // Review status does not matter for takes addressed by code.
  expect((await f.t.run(ctx => ctx.db.get(first.assetId)))?.status).toBe('awaiting_review');
  const second = await automationUpload(f, { folderId: f.scene, assetCode: 'blr_ep101_par_0020' });
  expect(second.assetId).toBe(first.assetId);
  const versions = await versionsOf(f, first.assetId);
  expect(versions.map(version => version.version).sort()).toEqual([1, 2]);
  expect((await f.t.run(ctx => ctx.db.get(first.assetId)))?.currentVersionId).toBe(versions.find(version => version.version === 2)!._id);
});

test('a take can be added without changing the pick, and the pick can be set by the API', async () => {
  const f = await seriesFixture();
  const { assetId } = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0030' });
  const [v1] = await versionsOf(f, assetId);
  const session = await f.t.mutation(internal.automation.beginUpload, { ...call(), projectId: f.project, folderId: f.scene, assetCode: 'BLR_EP101_PAR_0030', keepCurrentVersion: true, originalFilename: 'take.mp4', mimeType: 'video/mp4', sizeBytes: 100 });
  expect(session.assetId).toBe(assetId);
  await f.t.mutation(internal.automation.claimUpload, { keyDigest: cspDigest, sessionId: session.sessionId });
  await f.t.mutation(internal.automation.finalizeUpload, { keyDigest: cspDigest, sessionId: session.sessionId, verifiedSizeBytes: 100, posterKey: `${session.objectKey.slice(0, session.objectKey.lastIndexOf('/'))}/poster.jpg`, durationSec: 4, width: 1920, height: 1080 });
  expect((await f.t.run(ctx => ctx.db.get(assetId)))?.currentVersionId).toBe(v1._id);
  const v2 = (await versionsOf(f, assetId)).find(version => version.version === 2)!;
  await f.t.mutation(internal.automation.setCurrentVersion, { ...call(), assetId, versionId: v2._id });
  const asset = await f.t.run(ctx => ctx.db.get(assetId));
  expect(asset?.currentVersionId).toBe(v2._id);
  expect(asset?.storageKey).toBe(v2.originalKey);
  // The workspace sets the same pick.
  await f.t.mutation(internal.personal.setCurrentVersion, { assetId, versionId: v1._id });
  expect((await f.t.run(ctx => ctx.db.get(assetId)))?.currentVersionId).toBe(v1._id);
});

test('a code that lives in another folder is a conflict, not a new take', async () => {
  const f = await seriesFixture();
  await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  await expect(f.t.mutation(internal.automation.beginUpload, { ...call(), projectId: f.project, folderId: f.episode, assetCode: 'BLR_EP101_PAR_0020', originalFilename: 'take.mp4', mimeType: 'video/mp4', sizeBytes: 100 })).rejects.toThrow('Asset code already exists in another folder');
});

test('version metadata including gridImageVersionId round-trips through the API', async () => {
  const f = await seriesFixture();
  const shot = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  const grid = await automationUpload(f, { folderId: f.scene, name: 'grid.png', mimeType: 'image/png' });
  const [shotVersion] = await versionsOf(f, shot.assetId);
  const [gridVersion] = await versionsOf(f, grid.assetId);
  const metadata = { model: 'seedance-2', prompt: 'Rain on the parking lot', sourceLabel: 'Creative Studio Pro', referenceImageVersionIds: [gridVersion._id], gridImageVersionId: gridVersion._id };
  const { updatedAt } = await f.t.mutation(internal.automation.updateVersionMetadata, { ...call(), versionId: shotVersion._id, metadata, expectedUpdatedAt: null });
  const read = await f.t.mutation(internal.automation.versionMetadata, { keyDigest: cspDigest, versionId: shotVersion._id });
  expect(read.metadata).toEqual(metadata);
  expect(read.updatedAt).toBe(updatedAt);
  await expect(f.t.mutation(internal.automation.updateVersionMetadata, { ...call(), versionId: shotVersion._id, metadata, expectedUpdatedAt: null })).rejects.toThrow();
});

test('changes since a cursor report new takes, pick changes and metadata edits', async () => {
  const f = await seriesFixture();
  const empty = await f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: f.project, since: 0 });
  expect(empty.assets).toEqual([]);
  const { assetId } = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  const first = await f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: f.project, folderId: f.scene, since: 0 });
  expect(first.assets.map(asset => asset.assetCode)).toEqual(['BLR_EP101_PAR_0020']);
  expect(first.versions).toHaveLength(1);
  expect(first.versions[0]).toMatchObject({ assetId, version: 1, isCurrent: true });
  expect(Number(first.cursor)).toBeGreaterThan(0);
  // Long after the cursor nothing is reported; a later change is.
  await f.t.run(async ctx => {
    await ctx.db.patch(assetId, { updatedAt: 1 });
    for (const version of await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId)).collect()) await ctx.db.patch(version._id, { createdAt: 1, updatedAt: 1 });
  });
  const quiet = await f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: f.project, since: Number(first.cursor) });
  expect(quiet.assets).toEqual([]);
  await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  const next = await f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: f.project, since: Number(first.cursor) });
  expect(next.assets.map(asset => asset.assetId)).toEqual([assetId]);
  expect(next.versions.find(version => version.version === 2)?.isCurrent).toBe(true);
});

test('a credential restricted to one project cannot read or write another', async () => {
  const f = await seriesFixture();
  const other = await f.t.run(ctx => ctx.db.insert('projects', { title: 'Other series', slug: 'other', createdBy: f.owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false }));
  await expect(f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: other, since: 0 })).rejects.toThrow('Automation scope denied');
  await expect(f.t.mutation(internal.automation.beginUpload, { ...call(), projectId: other, assetCode: 'OTH_EP101_PAR_0010', originalFilename: 'take.mp4', mimeType: 'video/mp4', sizeBytes: 100 })).rejects.toThrow('Automation scope denied');
  await expect(f.t.mutation(internal.automation.createFolder, { ...call(), projectId: other, title: 'EP101', ownerApp: 'creative-studio-pro' })).rejects.toThrow('Automation scope denied');
});
