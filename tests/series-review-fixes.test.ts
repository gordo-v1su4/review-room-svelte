import { test, expect } from 'bun:test';
import { internal } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { automationUpload, call, cspDigest, seriesFixture, workspaceUpload } from './series-api-helpers';

type F = Awaited<ReturnType<typeof seriesFixture>>;
const versionsOf = (f: F, assetId: Id<'videos'>) => f.t.run(ctx => ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId)).collect());
const feed = (f: F, since: number) => f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: f.project, since });

test('the feed reports a take finishing processing even when the asset did not change', async () => {
  const f = await seriesFixture();
  const { assetId, jobId } = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  const first = await feed(f, 0);
  // Move everything well behind the cursor, then let the worker finish the job.
  await f.t.run(async ctx => {
    await ctx.db.patch(assetId, { updatedAt: 1 });
    for (const version of await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId)).collect()) await ctx.db.patch(version._id, { createdAt: 1, updatedAt: 1 });
    await ctx.db.patch(jobId!, { status: 'running', stage: 'finalize', runId: 'run-1' });
  });
  expect((await feed(f, Number(first.cursor))).versions).toEqual([]);
  await f.t.mutation(internal.mediaJobs.complete, { jobId: jobId!, attempt: 1, runId: 'run-1', durationSec: 6, width: 1280, height: 720, thumbnailKey: 'assets/x/thumb.jpg', spriteKey: 'assets/x/sprite.jpg' });
  await f.t.run(ctx => ctx.db.patch(assetId, { updatedAt: 1 }));
  const after = await feed(f, Number(first.cursor));
  expect(after.versions).toEqual([expect.objectContaining({ assetId, processingState: 'ready' })]);
  expect(after.assets.map(asset => asset.assetId)).toEqual([assetId]);
});

test('the feed reports a misfiled take under the shot it was filed into', async () => {
  const f = await seriesFixture();
  const { assetId: shot } = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  const stray = await workspaceUpload(f, { folderId: f.scene, name: 'outside.mp4' });
  const [strayVersion] = await versionsOf(f, stray);
  await f.t.run(async ctx => { await ctx.db.patch(strayVersion._id, { createdAt: 1, updatedAt: 1 }); });
  const before = await feed(f, 0);
  await f.t.mutation(internal.personal.fileMisfiledAsTake, { assetId: stray, shotId: shot });
  await f.t.run(ctx => ctx.db.patch(shot, { updatedAt: 1 }));
  const after = await feed(f, Number(before.cursor));
  expect(after.versions.find(version => version.versionId === strayVersion._id)).toMatchObject({ assetId: shot, version: 2 });
});

test('retrying a successful folder delete replays its result', async () => {
  const f = await seriesFixture();
  const plates: Id<'projectFolders'> = await f.t.mutation(internal.automation.createFolder, { ...call(), projectId: f.project, title: 'Plates', parentFolderId: f.scene, ownerApp: 'creative-studio-pro' });
  const request = { ...call(), projectId: f.project, folderId: plates, assetDisposition: 'move_to_root' as const };
  const first = await f.t.mutation(internal.automation.deleteFolder, request);
  expect(await f.t.mutation(internal.automation.deleteFolder, request)).toEqual(first);
});

test('picking or copying an older image uses that image\'s own dimensions', async () => {
  const f = await seriesFixture();
  const folder = await f.t.mutation(internal.personal.createFolder, { projectId: f.project, title: 'Stills' });
  const session = async (width: number, height: number, assetId?: Id<'videos'>) => {
    const begun = await f.t.mutation(internal.personal.beginUpload, { projectId: f.project, folderId: folder, ...(assetId ? { assetId } : {}), originalFilename: 'still.png', mimeType: 'image/png', sizeBytes: 100 });
    await f.t.run(ctx => ctx.db.patch(begun.sessionId, { status: 'finalizing', finalizingAt: Date.now() }));
    return await f.t.mutation(internal.personal.finalizeUpload, { sessionId: begun.sessionId, verifiedSizeBytes: 100, posterKey: `${begun.objectKey.slice(0, begun.objectKey.lastIndexOf('/'))}/poster.jpg`, durationSec: 0, width, height }) as Id<'videos'>;
  };
  const still = await session(800, 600);
  await f.t.run(ctx => ctx.db.patch(still, { status: 'approved' }));
  await session(4000, 3000, still);
  const [older] = (await versionsOf(f, still)).sort((a, b) => a.version - b.version);
  await f.t.mutation(internal.personal.setCurrentVersion, { assetId: still, versionId: older._id });
  const picked = await f.t.run(ctx => ctx.db.get(still));
  expect(picked).toMatchObject({ width: 800, height: 600 });
  expect(picked?.durationSec).toBeUndefined();
  await f.t.mutation(internal.personal.setCurrentVersion, { assetId: still, versionId: (await versionsOf(f, still)).find(version => version.version === 2)!._id });
  const { assetIds: [copy] } = await f.t.mutation(internal.personal.copyAssets, { projectId: f.project, sources: [{ assetId: still, versionId: older._id }] });
  expect(await f.t.run(ctx => ctx.db.get(copy))).toMatchObject({ width: 800, height: 600 });
});
