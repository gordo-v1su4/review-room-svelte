import { test, expect } from 'bun:test';
import { internal } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { automationUpload, call, completeProcessing, cspDigest, seriesFixture } from './series-api-helpers';

type F = Awaited<ReturnType<typeof seriesFixture>>;
const versionsOf = (f: F, assetId: Id<'videos'>) => f.t.run(ctx => ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId)).collect());
const get = (f: F, id: Id<'videos'>) => f.t.run(ctx => ctx.db.get(id));
const deletionKeys = (f: F) => f.t.run(async ctx => (await ctx.db.query('storageDeletionJobs').collect()).flatMap(job => job.keys));

/** A locked _Deliverables folder holding a two-take trailer with metadata on v1. */
async function deliverable() {
  const f = await seriesFixture();
  const deliverables: Id<'projectFolders'> = await f.t.mutation(internal.automation.createFolder, { ...call(), projectId: f.project, title: '_Deliverables', ownerApp: 'creative-studio-pro' });
  const { assetId } = await automationUpload(f, { folderId: deliverables, assetCode: 'BLR_S1_TRL01' });
  await automationUpload(f, { folderId: deliverables, assetCode: 'BLR_S1_TRL01' });
  await completeProcessing(f, assetId);
  const [v1, v2] = (await versionsOf(f, assetId)).sort((a, b) => a.version - b.version);
  await f.t.mutation(internal.automation.updateVersionMetadata, { ...call(), versionId: v1._id, metadata: { model: 'edit', prompt: 'Season trailer', sourceLabel: 'Creative Studio Pro', referenceImageVersionIds: [] } });
  return { ...f, deliverables, original: assetId, v1, v2 };
}

test('copying makes a new asset in an ordinary folder that shares the stored original and keeps code and metadata', async () => {
  const f = await deliverable();
  const { folderId, assetIds: [copyId] } = await f.t.mutation(internal.personal.copyAssets, { projectId: f.project, newFolderTitle: 'Trailer Feed — S1 trailer', sources: [{ assetId: f.original, versionId: f.v1._id }] });
  const copy = await get(f, copyId);
  expect(copy).toMatchObject({ folderId, assetCode: 'BLR_S1_TRL01', copiedFromAssetId: f.original, copiedFromVersionId: f.v1._id, storageKey: f.v1.originalKey });
  const [copyVersion] = await versionsOf(f, copyId);
  expect(copyVersion).toMatchObject({ version: 1, originalKey: f.v1.originalKey, posterKey: f.v1.posterKey });
  expect(copyVersion.creativeMetadata?.prompt).toBe('Season trailer');
  expect((await f.t.run(ctx => ctx.db.get(folderId!)))?.ownerApp).toBeUndefined();
  // The copy appears in the feed marked as a copy; the code still resolves to the original for new takes.
  const feed = await f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: f.project, since: 0 });
  expect(feed.assets.find(asset => asset.assetId === copyId)?.copiedFromAssetId).toBe(f.original);
  expect((await automationUpload(f, { folderId: f.deliverables, assetCode: 'BLR_S1_TRL01' })).assetId).toBe(f.original);
});

test('copies default to the current version and never land in a locked folder', async () => {
  const f = await deliverable();
  const { assetIds: [copyId] } = await f.t.mutation(internal.personal.copyAssets, { projectId: f.project, sources: [{ assetId: f.original }] });
  expect((await versionsOf(f, copyId))[0]).toMatchObject({ version: 2, originalKey: f.v2.originalKey });
  await expect(f.t.mutation(internal.personal.copyAssets, { projectId: f.project, folderId: f.scene, sources: [{ assetId: f.original }] })).rejects.toThrow('ordinary folder');
});

test('changing or deleting the copy never touches the original, and the other way round', async () => {
  const f = await deliverable();
  const { assetIds: [copyId] } = await f.t.mutation(internal.personal.copyAssets, { projectId: f.project, sources: [{ assetId: f.original, versionId: f.v1._id }] });
  const [copyVersion] = await versionsOf(f, copyId);
  await f.t.mutation(internal.personal.updateVersionMetadata, { versionId: copyVersion._id, metadata: { model: 'edit', prompt: 'Changed on the copy', sourceLabel: '', referenceImageVersionIds: [] } });
  expect((await f.t.run(ctx => ctx.db.get(f.v1._id)))?.creativeMetadata?.prompt).toBe('Season trailer');

  await f.t.mutation(internal.personal.deleteSelectedAssets, { projectId: f.project, assetIds: [copyId] });
  expect(await get(f, copyId)).toBeNull();
  expect(await get(f, f.original)).not.toBeNull();
  expect(await deletionKeys(f)).not.toContain(f.v1.originalKey);

  const second = (await f.t.mutation(internal.personal.copyAssets, { projectId: f.project, sources: [{ assetId: f.original, versionId: f.v1._id }] })).assetIds[0];
  await f.t.run(ctx => ctx.db.patch(f.deliverables, { ownerApp: undefined, ownerCredentialId: undefined }));
  await f.t.mutation(internal.personal.deleteSelectedAssets, { projectId: f.project, assetIds: [f.original] });
  expect(await get(f, second)).not.toBeNull();
  const keys = await deletionKeys(f);
  expect(keys).not.toContain(f.v1.originalKey); // still used by the second copy
  expect(keys).toContain(f.v2.originalKey); // only the original used v2
});

test('the copy folder is an ordinary Trailer Feed source with the copied version selectable', async () => {
  const f = await deliverable();
  const { folderId, assetIds: [copyId] } = await f.t.mutation(internal.personal.copyAssets, { projectId: f.project, newFolderTitle: 'Trailer Feed — S1 trailer', sources: [{ assetId: f.original }] });
  expect((await f.t.query(internal.destinationSync.prepareConnection, { projectId: f.project, folderId: folderId! })).folderId).toBe(folderId!);
  const workspace = await f.t.query(internal.destinationSync.workspace, { projectId: f.project, folderId: folderId! });
  expect(workspace.versions.map(version => version.assetId)).toEqual([copyId]);
  expect(workspace.versions[0]).toMatchObject({ assetCode: 'BLR_S1_TRL01', isCurrent: true, ready: true });
  await expect(f.t.query(internal.destinationSync.prepareConnection, { projectId: f.project, folderId: f.deliverables })).rejects.toThrow();
});
