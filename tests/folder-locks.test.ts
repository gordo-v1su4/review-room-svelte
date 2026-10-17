import { test, expect } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';

const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })]
  .map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));

const ownerDigest = 'c'.repeat(64);
const otherDigest = 'd'.repeat(64);
let requestCounter = 0;
const call = (keyDigest: string) => ({ keyDigest, requestKey: `request-${++requestCounter}`, bodyDigest: (requestCounter % 10).toString().repeat(64) });

async function fixture() {
  const t = convexTest(schema, modules);
  const { project, owner } = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Blood Rush', slug: 'blood-rush', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    return { project, owner };
  });
  await t.mutation(internal.automation.issue, { name: 'Creative Studio Pro', keyDigest: ownerDigest, projectId: project, actions: ['folders:write', 'media:read'] });
  await t.mutation(internal.automation.issue, { name: 'Other agent', keyDigest: otherDigest, projectId: project, actions: ['folders:write'] });
  const episode: Id<'projectFolders'> = await t.mutation(internal.automation.createFolder, { ...call(ownerDigest), projectId: project, title: 'EP101 — The Late Shift', ownerApp: 'creative-studio-pro' });
  const scene: Id<'projectFolders'> = await t.mutation(internal.automation.createFolder, { ...call(ownerDigest), projectId: project, title: '010 PAR — Parking Lot', parentFolderId: episode, ownerApp: 'creative-studio-pro' });
  const normal: Id<'projectFolders'> = await t.mutation(internal.personal.createFolder, { projectId: project, title: 'Selects' });
  return { t, project, owner, episode, scene, normal };
}

const folder = (t: Awaited<ReturnType<typeof fixture>>['t'], id: Id<'projectFolders'>) => t.run(ctx => ctx.db.get(id));

test('folders created with ownerApp are locked and owned by the calling credential', async () => {
  const { t, project, episode, normal } = await fixture();
  const locked = await folder(t, episode);
  expect(locked?.ownerApp).toBe('creative-studio-pro');
  expect(locked?.ownerCredentialId).toBeDefined();
  expect((await folder(t, normal))?.ownerApp).toBeUndefined();
  const catalog = await t.mutation(internal.automation.catalog, { keyDigest: ownerDigest, projectId: project });
  expect(catalog.folders.find(item => item.id === episode)).toMatchObject({ locked: true, ownerApp: 'creative-studio-pro', ownedByCaller: true });
  expect(catalog.folders.find(item => item.id === normal)).toMatchObject({ locked: false, ownerApp: null, ownedByCaller: false });
});

test('workspace users cannot rename, move, delete or add subfolders to a locked folder', async () => {
  const { t, project, episode, scene, normal } = await fixture();
  await expect(t.mutation(internal.personal.renameFolder, { folderId: episode, title: 'Renamed' })).rejects.toThrow('Folder is locked');
  await expect(t.mutation(internal.personal.moveFolder, { folderId: scene, parentFolderId: normal })).rejects.toThrow('Folder is locked');
  await expect(t.mutation(internal.personal.removeFolder, { folderId: scene, assetDisposition: 'move_to_root' })).rejects.toThrow('Folder is locked');
  await expect(t.mutation(internal.personal.createFolder, { projectId: project, title: 'Stray', parentFolderId: episode })).rejects.toThrow('Folder is locked');
  await expect(t.mutation(internal.personal.moveFolder, { folderId: normal, parentFolderId: scene })).rejects.toThrow('Folder is locked');
  expect((await folder(t, episode))?.title).toBe('EP101 — The Late Shift');
  expect((await folder(t, scene))?.parentFolderId).toBe(episode);
});

test('an ordinary folder carrying a locked folder inside cannot be moved by a workspace user', async () => {
  const { t, project, normal } = await fixture();
  const holder = await t.mutation(internal.personal.createFolder, { projectId: project, title: 'Holder' });
  await t.mutation(internal.automation.createFolder, { ...call(ownerDigest), projectId: project, title: '_Deliverables', parentFolderId: holder, ownerApp: 'creative-studio-pro' });
  await expect(t.mutation(internal.personal.moveFolder, { folderId: holder, parentFolderId: normal })).rejects.toThrow('Folder is locked');
  await t.mutation(internal.personal.renameFolder, { folderId: holder, title: 'Holder renamed' });
});

test('other credentials are refused; the owning credential may rename, move and delete', async () => {
  const { t, project, episode, scene } = await fixture();
  await expect(t.mutation(internal.automation.editFolder, { ...call(otherDigest), projectId: project, folderId: episode, title: 'Hijack' })).rejects.toThrow('Folder is locked');
  await expect(t.mutation(internal.automation.editFolder, { ...call(otherDigest), projectId: project, folderId: scene, parentFolderId: null })).rejects.toThrow('Folder is locked');
  await expect(t.mutation(internal.automation.deleteFolder, { ...call(otherDigest), projectId: project, folderId: scene, assetDisposition: 'move_to_root' })).rejects.toThrow('Automation scope denied');
  await expect(t.mutation(internal.automation.createFolder, { ...call(otherDigest), projectId: project, title: 'Stray', parentFolderId: episode })).rejects.toThrow('Folder is locked');

  await t.mutation(internal.automation.editFolder, { ...call(ownerDigest), projectId: project, folderId: episode, title: 'EP101 — Night Shift' });
  expect((await folder(t, episode))?.title).toBe('EP101 — Night Shift');
  await t.mutation(internal.automation.editFolder, { ...call(ownerDigest), projectId: project, folderId: scene, parentFolderId: null });
  expect((await folder(t, scene))?.parentFolderId).toBeUndefined();
  await t.mutation(internal.automation.editFolder, { ...call(ownerDigest), projectId: project, folderId: scene, parentFolderId: episode });
  await expect(t.mutation(internal.automation.deleteFolder, { ...call(ownerDigest), projectId: project, folderId: episode, assetDisposition: 'move_to_root' })).rejects.toThrow('Move or remove subfolders first');
  await t.mutation(internal.automation.deleteFolder, { ...call(ownerDigest), projectId: project, folderId: scene, assetDisposition: 'move_to_root' });
  expect(await folder(t, scene)).toBeNull();
});

test('automation never deletes ordinary folders', async () => {
  const { t, project, normal } = await fixture();
  await expect(t.mutation(internal.automation.deleteFolder, { ...call(ownerDigest), projectId: project, folderId: normal, assetDisposition: 'move_to_root' })).rejects.toThrow('Automation scope denied');
  expect(await folder(t, normal)).not.toBeNull();
});

test('locked folders cannot be created outside the automation API', async () => {
  const { t, owner, project } = await fixture();
  const { createPersonalFolder } = await import('../convex/lib/personalCommands');
  await expect(t.run(ctx => createPersonalFolder(ctx, owner, project, 'Sneaky', undefined, { ownerApp: 'creative-studio-pro' }))).rejects.toThrow('automation credential');
});

test('media can still be filed into a locked folder', async () => {
  const { t, project, owner, scene } = await fixture();
  const asset = await t.run(ctx => ctx.db.insert('videos', { projectId: project, title: 'Take', originalFilename: 'take.mp4', storageKey: 'private/take.mp4', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 }));
  await t.mutation(internal.personal.moveAssets, { projectId: project, folderId: scene, assetIds: [asset] });
  expect((await t.run(ctx => ctx.db.get(asset)))?.folderId).toBe(scene);
});

test('a locked folder cannot be connected to Trailer Feed', async () => {
  const { t, project, scene, normal } = await fixture();
  const locked = t.query(internal.destinationSync.prepareConnection, { projectId: project, folderId: scene });
  await expect(locked).rejects.toThrow();
  await locked.catch(cause => expect(JSON.stringify(cause.data ?? cause.message)).toContain('SYNC_FOLDER_LOCKED'));
  await expect(t.mutation(internal.destinationSync.saveConnection, { destinationKey: 'trailer-feed', projectId: project, folderId: scene, targetRunId: 'run_1' })).rejects.toThrow();
  const ordinary = await t.query(internal.destinationSync.prepareConnection, { projectId: project, folderId: normal });
  expect(ordinary.folderId).toBe(normal);
  const workspace = await t.query(internal.destinationSync.workspace, { projectId: project });
  expect(workspace.folders.find(item => item.id === scene)?.locked).toBe(true);
});

