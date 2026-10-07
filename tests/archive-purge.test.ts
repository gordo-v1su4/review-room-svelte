import { expect, test } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';

const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })]
  .map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Purge fixture', slug: 'purge-fixture', createdBy: owner,
      createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false, archived: true, purgeStartedAt: 1 });
    return { owner, project };
  });
  return { t, ...ids };
}

test('archived-project continuation queues folder covers before deleting each bounded folder batch', async () => {
  const { t, owner, project } = await fixture();
  const untouched = await t.run(async ctx => {
    const other = await ctx.db.insert('projects', { title: 'Retained', slug: 'retained', createdBy: owner,
      createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const unrelated = await ctx.db.insert('projectFolders', { projectId: other, title: 'Retained folder', coverImageKey: 'assets/retained/cover.jpg', order: 1, createdBy: owner, createdAt: 1, updatedAt: 1 });
    for (let i = 0; i < 110; i++) await ctx.db.insert('projectFolders', { projectId: project, title: `Folder ${i}`, order: i,
      ...(i === 0 || i === 109 ? { coverImageKey: `assets/purge/cover-${i}.jpg` } : {}), createdBy: owner, createdAt: 1, updatedAt: 1 });
    return unrelated;
  });
  await t.mutation(internal.personal.continueArchivedPurge, { projectId: project, ownerId: owner });
  const first = await t.run(async ctx => ({ folders: await ctx.db.query('projectFolders').withIndex('by_project', q => q.eq('projectId', project)).collect(),
    jobs: await ctx.db.query('storageDeletionJobs').collect(), retained: await ctx.db.get(untouched) }));
  expect(first.folders.length).toBe(10);
  expect(first.jobs.flatMap(job => job.keys)).toEqual(['assets/purge/cover-0.jpg']);
  expect(first.retained?.coverImageKey).toBe('assets/retained/cover.jpg');
  await t.mutation(internal.personal.continueArchivedPurge, { projectId: project, ownerId: owner });
  const second = await t.run(async ctx => ({ folders: await ctx.db.query('projectFolders').withIndex('by_project', q => q.eq('projectId', project)).collect(), jobs: await ctx.db.query('storageDeletionJobs').collect() }));
  expect(second.folders).toEqual([]);
  expect(second.jobs.flatMap(job => job.keys)).toEqual(['assets/purge/cover-0.jpg', 'assets/purge/cover-109.jpg']);
});

test('archive purge removes publication references across showcase pages without disturbing unrelated entries', async () => {
  const { t, owner, project } = await fixture();
  const ids = await t.run(async ctx => {
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Clip', originalFilename: 'clip.mp4', storageKey: 'assets/purge/clip.mp4',
      mimeType: 'video/mp4', status: 'approved', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false,
      order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const version = await ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: 'assets/purge/clip.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 1 });
    const publication = await ctx.db.insert('publications', { assetId: asset, versionId: version, slug: 'purged', allowedOrigins: ['https://example.com'], createdAt: 1, updatedAt: 1 });
    const retained = await ctx.db.insert('publications', { assetId: asset, versionId: version, slug: 'retained', allowedOrigins: ['https://example.com'], createdAt: 1, updatedAt: 1 });
    for (let i = 0; i < 105; i++) await ctx.db.insert('showcases', { title: `Showcase ${i}`, slug: `showcase-${i}`, publicationIds: [publication, retained], allowedOrigins: [], createdAt: 1, updatedAt: 1 });
    return { publication, retained };
  });
  await t.mutation(internal.personal.continueArchivedPurge, { projectId: project, ownerId: owner });
  const first = await t.run(async ctx => ({ showcases: await ctx.db.query('showcases').collect(), publication: await ctx.db.get(ids.publication), scheduled: await ctx.db.system.query('_scheduled_functions').collect() }));
  expect(first.publication).not.toBeNull();
  expect(first.showcases.filter(row => row.publicationIds.includes(ids.publication)).length).toBe(5);
  const continuation = first.scheduled.find(row => row.name.includes('continueArchivedPurge'))!;
  await t.mutation(internal.personal.continueArchivedPurge, continuation.args[0]);
  const last = await t.run(async ctx => ({ showcases: await ctx.db.query('showcases').collect(), publication: await ctx.db.get(ids.publication) }));
  expect(last.publication).toBeNull();
  expect(last.showcases.length).toBe(105);
  expect(last.showcases.every(row => row.publicationIds.length === 1 && row.publicationIds[0] === ids.retained)).toBe(true);
});
