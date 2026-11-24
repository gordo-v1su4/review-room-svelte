import { test, expect } from 'bun:test';
import { internal } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { automationUpload, call, completeProcessing, cspDigest, seriesFixture } from './series-api-helpers';

type F = Awaited<ReturnType<typeof seriesFixture>>;
const versionsOf = async (f: F, assetId: Id<'videos'>) =>
  (await f.t.run(ctx => ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId)).collect())).sort((a, b) => a.version - b.version);
const feed = (f: F, since: number) => f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: f.project, since });
const workspace = (f: F, since: number, known?: number) => f.t.query(internal.personal.changes, { projectId: f.project, since, ...(known === undefined ? {} : { known }) });

/** A shot with two takes (the second is current), then every timestamp aged so only a later write can be reported. */
async function agedShot(f: F) {
  const { assetId } = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  await completeProcessing(f, assetId);
  const before = Number((await feed(f, 0)).cursor);
  await f.t.run(async ctx => {
    await ctx.db.patch(assetId, { updatedAt: 1, versionsUpdatedAt: 1 });
    for (const version of await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId)).collect()) await ctx.db.patch(version._id, { createdAt: 1, updatedAt: 1 });
  });
  const [v1, v2] = await versionsOf(f, assetId);
  return { assetId, v1, v2, before };
}

test('a take made current in the workspace reaches Creative Studio Pro through the changes feed', async () => {
  const f = await seriesFixture();
  const { assetId, v1, v2, before } = await agedShot(f);
  expect((await f.t.run(ctx => ctx.db.get(assetId)))?.currentVersionId).toBe(v2._id);
  expect((await feed(f, before)).assets).toEqual([]);
  await f.t.mutation(internal.personal.setCurrentVersion, { assetId, versionId: v1._id });
  const after = await feed(f, before);
  expect(after.assets).toHaveLength(1);
  expect(after.assets[0]).toMatchObject({ assetId, currentVersionId: v1._id });
  expect(after.assets[0].updatedAt).toBeGreaterThanOrEqual(before);
  expect(Number(after.cursor)).toBeGreaterThanOrEqual(before);
});

test('making the current take current again is not reported as a change', async () => {
  const f = await seriesFixture();
  const { assetId, v2, before } = await agedShot(f);
  await f.t.mutation(internal.personal.setCurrentVersion, { assetId, versionId: v2._id });
  expect((await feed(f, before)).assets).toEqual([]);
});

test('the open workspace reads a pick, a status and an exclusion made through the API', async () => {
  const f = await seriesFixture();
  const { assetId, v1, v2, before } = await agedShot(f);
  expect(await workspace(f, before)).toMatchObject({ assets: [], versions: [], removedAssetIds: [] });
  await f.t.mutation(internal.automation.setCurrentVersion, { ...call(), assetId, versionId: v1._id });
  await f.t.mutation(internal.automation.setAssetReviewStatus, { ...call(), assetId, status: 'needs_changes' });
  await f.t.mutation(internal.automation.setVersionExcluded, { ...call(), versionId: v2._id, excluded: true });
  const changes = await workspace(f, before);
  expect(changes.assets).toHaveLength(1);
  expect(changes.assets[0]).toMatchObject({ id: assetId, projectId: f.project, folderId: f.scene, name: 'BLR_EP101_PAR_0020', status: 'needs_changes',
    processing: { assetId, versionId: v1._id, versionNumber: 1, ready: true, hasPoster: true } });
  expect(changes.versions).toEqual([expect.objectContaining({ id: v2._id, assetId, version: 2, excluded: true, processingState: 'ready' })]);
  expect(Number(changes.cursor)).toBeGreaterThanOrEqual(before);
  // Nothing that locates stored media leaves the server.
  const sent = JSON.stringify(changes);
  expect(sent).not.toMatch(/Key/);
  for (const key of [v1.originalKey, v2.originalKey, v1.posterKey!]) expect(sent).not.toContain(key);
});

test('the open workspace reads a new take and a new asset', async () => {
  const f = await seriesFixture();
  const { assetId, before } = await agedShot(f);
  await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  const added = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0030' });
  const changes = await workspace(f, before);
  expect(changes.assets.map(asset => asset.id).sort()).toEqual([assetId, added.assetId].sort());
  expect(changes.versions.map(version => [version.assetId, version.version])).toEqual(expect.arrayContaining([[assetId, 3], [added.assetId, 1]]));
  expect(changes.versions).toHaveLength(2);
  expect(changes.assets.find(asset => asset.id === assetId)?.processing.versionNumber).toBe(3);
});

test('asset ids are listed only when the workspace holds a different number of assets', async () => {
  const f = await seriesFixture();
  const { assetId, before } = await agedShot(f);
  expect((await workspace(f, before, 1)).assetIds).toBeUndefined();
  expect((await workspace(f, before)).assetIds).toBeUndefined();
  expect((await workspace(f, before, 2)).assetIds).toEqual([assetId]);
});

test('the workspace read is refused for an archived project and a bad cursor', async () => {
  const f = await seriesFixture();
  await expect(workspace(f, -1)).rejects.toThrow('Invalid cursor');
  await f.t.run(ctx => ctx.db.patch(f.project, { archived: true }));
  await expect(workspace(f, 0)).rejects.toThrow('Project unavailable');
});
