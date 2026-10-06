import { test, expect } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';

const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })]
  .map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));

test('explicit destination consent serves the selected ready version without requiring approval or floating to a later upload', async () => {
  const t = convexTest(schema, modules);
  const { asset, first } = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Grant verification', slug: 'grant-verification', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Clip', originalFilename: 'clip.mp4', storageKey: 'private/latest.mp4', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const first = await ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: 'private/first.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 1 });
    const second = await ctx.db.insert('assetVersions', { assetId: asset, version: 2, originalKey: 'private/second.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 2 });
    await ctx.db.patch(asset, { currentVersionId: second });
    return { asset, first };
  });
  const grant = await t.mutation(internal.publicationGrants.issue, { destinationKey: 'trailer-feed', versionId: first, allowedOrigins: ['https://portfolio.example'] });
  expect(grant.versionId).toBe(first);
  expect(JSON.stringify(grant)).not.toContain('private/');
  await t.run(async ctx => {
    const third = await ctx.db.insert('assetVersions', { assetId: asset, version: 3, originalKey: 'private/third.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 3 });
    await ctx.db.patch(asset, { currentVersionId: third });
  });
  const resolved = await t.query(internal.publicationGrants.resolve, { slug: grant.slug, versionId: first, variant: 'original', origin: 'https://portfolio.example' });
  expect(resolved?.key).toBe('private/first.mp4');
});
