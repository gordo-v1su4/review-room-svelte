import { test, expect } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';
const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })].map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Private review QA', slug: 'private-review-qa', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: true });
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Still', originalFilename: 'image.jpg', mimeType: 'image/jpeg', assetClass: 'IMG', storageKey: 'private/image.jpg', processingStatus: 'ready', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: true, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const version = await ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: 'private/image.jpg', mimeType: 'image/jpeg', sizeBytes: 100, processingState: 'ready', createdAt: 1 });
    await ctx.db.patch(asset, { currentVersionId: version });
    const link = await ctx.db.insert('reviewLinks', { projectId: project, token: 'review-token', canDownload: true, createdAt: 1 });
    return { project, asset, version, link };
  });
  return { t, ...ids };
}
test('comment retry is idempotent and changed payload cannot silently overwrite it', async () => {
  const { t, asset } = await fixture();
  const request = { token: 'review-token', videoId: asset, body: 'Keep the framing', requestId: 'comment-1' };
  await t.mutation(api.reviewPublic.clientAddComment, request);
  await t.mutation(api.reviewPublic.clientAddComment, request);
  const comments = await t.query(api.reviewPublic.listCommentsByVideo, { token: request.token, videoId: asset });
  expect(comments).toHaveLength(1);
  expect(comments[0].body).toBe('Keep the framing');
  await expect(t.mutation(api.reviewPublic.clientAddComment, { ...request, body: 'Changed note' })).rejects.toThrow('Comment retry changed');
});
test('exact original downloads enforce asset/link consent, archive, version ownership and revocation', async () => {
  const { t, asset, version, link, project } = await fixture();
  const request = { token: 'review-token', assetId: asset, versionId: version, checkedAt: Date.now() };
  expect((await t.query(internal.privateReview.download, request))?.key).toBe('private/image.jpg');
  await t.run(ctx => ctx.db.patch(asset, { downloadEnabled: false }));
  expect(await t.query(internal.privateReview.download, request)).toBeNull();
  await t.run(async ctx => { await ctx.db.patch(asset, { downloadEnabled: true }); await ctx.db.patch(link, { canDownload: false }); });
  expect(await t.query(internal.privateReview.download, request)).toBeNull();
  await t.run(async ctx => { await ctx.db.patch(link, { canDownload: true }); await ctx.db.patch(project, { archived: true }); });
  await expect(t.query(internal.privateReview.download, request)).rejects.toThrow('Review link unavailable');
  await t.run(async ctx => { await ctx.db.patch(project, { archived: false }); await ctx.db.patch(link, { revokedAt: Date.now() }); });
  await expect(t.query(internal.privateReview.download, request)).rejects.toThrow('Review link unavailable');
});

