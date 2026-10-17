import { test, expect } from 'bun:test';
import { internal } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { automationUpload, call, cspDigest, seriesFixture, workspaceUpload } from './series-api-helpers';

type F = Awaited<ReturnType<typeof seriesFixture>>;
const versionsOf = (f: F, assetId: Id<'videos'>) => f.t.run(ctx => ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId)).collect());
const get = (f: F, id: Id<'videos'>) => f.t.run(ctx => ctx.db.get(id));

async function withShot() {
  const f = await seriesFixture();
  const { assetId: shot } = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  return { ...f, shot };
}

test('a dropped file named with the shot code becomes its next version, ignoring its own _v###', async () => {
  const f = await withShot();
  const assetId = await workspaceUpload(f, { folderId: f.scene, name: 'blr_ep101_par_0020_v007.mp4' });
  expect(assetId).toBe(f.shot);
  expect((await versionsOf(f, f.shot)).map(version => version.version).sort()).toEqual([1, 2]);
  const plain = await workspaceUpload(f, { folderId: f.scene, name: 'BLR_EP101_PAR_0020.mov' });
  expect(plain).toBe(f.shot);
  expect((await get(f, f.shot))?.misfiled).toBeUndefined();
});

test('no code, another scene\'s code or an unknown shot is kept but marked misfiled', async () => {
  const f = await withShot();
  for (const name of ['render final.mp4', 'BLR_EP101_DIN_0010_v002.mp4', 'BLR_EP101_PAR_0990.mp4']) {
    const assetId = await workspaceUpload(f, { folderId: f.scene, name });
    expect(assetId).not.toBe(f.shot);
    const asset = await get(f, assetId);
    expect(asset?.misfiled).toBe(true);
    expect(asset?.folderId).toBe(f.scene);
  }
  // Ordinary folders never mark drops misfiled.
  const normal = await f.t.mutation(internal.personal.createFolder, { projectId: f.project, title: 'Selects' });
  expect((await get(f, await workspaceUpload(f, { folderId: normal, name: 'render final.mp4' })))?.misfiled).toBeUndefined();
});

test('fix-up: confirming the shot files the item as its next version and reports the removal', async () => {
  const f = await withShot();
  const stray = await workspaceUpload(f, { folderId: f.scene, name: 'outside render.mp4' });
  const [strayVersion] = await versionsOf(f, stray);
  const before = await f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: f.project, folderId: f.scene, since: 0 });
  expect(before.assets.find(asset => asset.assetId === stray)?.misfiled).toBe(true);

  await f.t.mutation(internal.personal.fileMisfiledAsTake, { assetId: stray, shotId: f.shot });
  expect(await get(f, stray)).toBeNull();
  const versions = await versionsOf(f, f.shot);
  expect(versions.find(version => version._id === strayVersion._id)?.version).toBe(2);
  expect((await get(f, f.shot))?.currentVersionId).toBe(strayVersion._id);
  const after = await f.t.mutation(internal.automation.changes, { keyDigest: cspDigest, projectId: f.project, since: Number(before.cursor) });
  expect(after.removedAssets).toEqual([expect.objectContaining({ assetId: stray, mergedIntoAssetId: f.shot, reason: 'filed_as_take' })]);
});

test('fix-up: moving to the right scene folder matches the filename there', async () => {
  const f = await withShot();
  const diner: Id<'projectFolders'> = await f.t.mutation(internal.automation.createFolder, { ...call(), projectId: f.project, title: '020 DIN — Diner', parentFolderId: f.episode, ownerApp: 'creative-studio-pro' });
  const { assetId: dinerShot } = await automationUpload(f, { folderId: diner, assetCode: 'BLR_EP101_DIN_0010' });
  const stray = await workspaceUpload(f, { folderId: f.scene, name: 'BLR_EP101_DIN_0010_v002.mp4' });
  expect((await get(f, stray))?.misfiled).toBe(true);
  const result = await f.t.mutation(internal.personal.moveMisfiledAsset, { assetId: stray, folderId: diner });
  expect(result).toMatchObject({ assetId: dinerShot, misfiled: false });
  expect((await versionsOf(f, dinerShot))).toHaveLength(2);
  // Moving an unmatched item into an ordinary folder clears the flag.
  const other = await workspaceUpload(f, { folderId: f.scene, name: 'notes.mp4' });
  const selects = await f.t.mutation(internal.personal.createFolder, { projectId: f.project, title: 'Selects' });
  expect(await f.t.mutation(internal.personal.moveMisfiledAsset, { assetId: other, folderId: selects })).toMatchObject({ assetId: other, misfiled: false });
  expect((await get(f, other))?.misfiled).toBeUndefined();
});

test('only misfiled items can be filed, and only onto a shot of the same media family', async () => {
  const f = await withShot();
  await expect(f.t.mutation(internal.personal.fileMisfiledAsTake, { assetId: f.shot, shotId: f.shot })).rejects.toThrow('not misfiled');
  const still = await workspaceUpload(f, { folderId: f.scene, name: 'frame.png', mimeType: 'image/png' });
  await expect(f.t.mutation(internal.personal.fileMisfiledAsTake, { assetId: still, shotId: f.shot })).rejects.toThrow('Upload class does not match');
});
