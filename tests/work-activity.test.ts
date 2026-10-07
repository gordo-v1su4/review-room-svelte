import { expect, test, jest, afterEach } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';
const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })]
  .map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('owner activity exposes real job transitions without foreign projects or private delivery payloads', async () => {
  jest.useFakeTimers();
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const foreignUser = await ctx.db.insert('users', { email: 'other@review-room.invalid' });
    const foreign = await ctx.db.insert('appUsers', { authUserId: foreignUser, name: 'Other owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Neon', slug: 'neon', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const other = await ctx.db.insert('projects', { title: 'Foreign private project', slug: 'foreign', createdBy: foreign, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const createAsset = async (projectId: typeof project) => {
      const asset = await ctx.db.insert('videos', { projectId, title: 'Clip', originalFilename: 'clip.mp4', storageKey: 'PRIVATE-STORAGE-KEY', mimeType: 'video/mp4', processingStatus: 'processing', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
      const version = await ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: 'PRIVATE-STORAGE-KEY', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'processing', createdAt: 1 });
      await ctx.db.patch(asset, { currentVersionId: version });
      const job = await ctx.db.insert('mediaJobs', { assetId: asset, versionId: version, status: 'running', stage: 'derivatives', attempt: 1, createdAt: 1, updatedAt: 1000 });
      return { asset, version, job };
    };
    return { project, own: await createAsset(project), foreign: await createAsset(other) };
  });
  const first = await t.query(internal.workActivity.list, { now: 2000, observedIds: [`ingest:${ids.foreign.job}`] });
  expect(first.items).toHaveLength(1);
  expect(first.items[0].stage).toBe('Preparing previews');
  expect(JSON.stringify(first)).not.toContain('PRIVATE-STORAGE-KEY');
  expect(JSON.stringify(first)).not.toContain('Foreign private project');
  await t.run(async ctx => { await ctx.db.patch(ids.own.job, { status: 'ready', updatedAt: 3000 }); await ctx.db.patch(ids.own.asset, { processingStatus: 'ready', updatedAt: 3000 }); });
  const finished = await t.query(internal.workActivity.list, { now: 15000, observedIds: [`ingest:${ids.own.job}`] });
  expect(finished.items[0].state).toBe('complete');
  expect(finished.items[0].stage).toBe('Ready to review');
  const replacementJob = await t.run(async ctx => {
    const version = await ctx.db.insert('assetVersions', { assetId: ids.own.asset, version: 2, originalKey: 'REPLACEMENT-PRIVATE-KEY', mimeType: 'video/mp4', sizeBytes: 200, processingState: 'processing', createdAt: 16000 });
    await ctx.db.patch(ids.own.asset, { currentVersionId: version, processingStatus: 'processing', updatedAt: 16000 });
    return ctx.db.insert('mediaJobs', { assetId: ids.own.asset, versionId: version, status: 'queued', stage: 'verify', attempt: 1, createdAt: 16000, updatedAt: 16000 });
  });
  const replaced = await t.query(internal.workActivity.list, { now: 17000, observedIds: [`ingest:${ids.own.job}`] });
  expect(replaced.items).toHaveLength(1);
  expect(replaced.items[0].id).toBe(`ingest:${replacementJob}`);
  expect(replaced.items[0].state).toBe('queued');
  await t.run(ctx => ctx.db.patch(ids.project, { archived: true }));
  expect((await t.query(internal.workActivity.list, { now: 16000, observedIds: [`ingest:${ids.own.job}`] })).items).toEqual([]);
});
