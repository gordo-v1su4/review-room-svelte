import { test, expect, spyOn } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';

const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })]
  .map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));

async function videoFixture() {
  const t = convexTest(schema, modules);
  const { project, asset, first } = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Grant verification', slug: 'grant-verification', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Clip', originalFilename: 'clip.mp4', storageKey: 'assets/private/latest.mp4', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const first = await ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: 'assets/private/first.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 1 });
    const second = await ctx.db.insert('assetVersions', { assetId: asset, version: 2, originalKey: 'assets/private/second.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 2 });
    await ctx.db.patch(asset, { currentVersionId: second });
    return { project, asset, first };
  });
  return { t, project, asset, first };
}

test('explicit destination consent serves the selected ready version without requiring approval or floating to a later upload', async () => {
  const { t, asset, first } = await videoFixture();
  const grant = await t.mutation(internal.publicationGrants.issue, { destinationKey: 'trailer-feed', versionId: first, allowedOrigins: ['https://portfolio.example'] });
  expect(grant.versionId).toBe(first);
  expect(JSON.stringify(grant)).not.toContain('private/');
  await t.run(async ctx => {
    const third = await ctx.db.insert('assetVersions', { assetId: asset, version: 3, originalKey: 'private/third.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 3 });
    await ctx.db.patch(asset, { currentVersionId: third });
  });
  const resolved = await t.query(internal.publicationGrants.resolve, { slug: grant.slug, versionId: first, variant: 'original', origin: 'https://portfolio.example' });
  expect(resolved?.key).toBe('assets/private/first.mp4');
});

test('owner revocation immediately denies delivery and issuance retries cannot restore consent', async () => {
  const { t, first } = await videoFixture();
  const consent = { destinationKey: 'trailer-feed' as const, versionId: first, allowedOrigins: ['https://portfolio.example'] };
  const grant = await t.mutation(internal.publicationGrants.issue, consent);
  expect((await t.mutation(internal.publicationGrants.issue, consent)).slug).toBe(grant.slug);
  await t.mutation(internal.publicationGrants.revoke, { grantId: grant.grantId });
  expect(await t.query(internal.publicationGrants.resolve, { slug: grant.slug, versionId: first, variant: 'original' })).toBeNull();
  await expect(t.mutation(internal.publicationGrants.issue, consent)).rejects.toThrow('GRANT_REVOKED');
});

test('a new exact-version sync confirmation rotates consent once and stale revocation cannot disable it', async () => {
  const { t, first } = await videoFixture();
  const selection = { destinationKey: 'trailer-feed' as const, versionId: first, allowedOrigins: ['https://portfolio.example'] };
  const old = await t.mutation(internal.publicationGrants.issue, selection);
  const confirmation = { ...selection, expectedGeneration: 1, confirmationId: 'deliberate-sync-again-1' };
  const fresh = await t.mutation(internal.publicationGrants.confirmAgain, confirmation);
  expect(fresh.consentGeneration).toBe(2);
  expect(fresh.slug).not.toBe(old.slug);
  expect((await t.mutation(internal.publicationGrants.confirmAgain, confirmation)).slug).toBe(fresh.slug);
  expect(await t.query(internal.publicationGrants.resolve, { slug: old.slug, versionId: first, variant: 'original' })).toBeNull();
  expect((await t.query(internal.publicationGrants.resolve, { slug: fresh.slug, versionId: first, variant: 'original' }))?.key).toBe('assets/private/first.mp4');
  await expect(t.mutation(internal.publicationGrants.revoke, { grantId: old.grantId, expectedGeneration: 1 })).rejects.toThrow('GRANT_GENERATION_CHANGED');
  await expect(t.mutation(internal.publicationGrants.issue, selection)).rejects.toThrow('GRANT_CONSENT_CHANGED');
  const newer = await t.mutation(internal.publicationGrants.confirmAgain, { ...confirmation, expectedGeneration: 2, confirmationId: 'deliberate-sync-again-2' });
  expect(newer.consentGeneration).toBe(3);
  await expect(t.mutation(internal.publicationGrants.confirmAgain, confirmation)).rejects.toThrow('GRANT_GENERATION_CHANGED');
});

test('source deletion denies a grant immediately through the normal owner deletion operation', async () => {
  const { t, project, asset, first } = await videoFixture();
  const grant = await t.mutation(internal.publicationGrants.issue, { destinationKey: 'trailer-feed', versionId: first, allowedOrigins: ['https://portfolio.example'] });
  await t.mutation(internal.personal.deleteSelectedAssets, { projectId: project, assetIds: [asset] });
  expect(await t.query(internal.publicationGrants.resolve, { slug: grant.slug, versionId: first, variant: 'original' })).toBeNull();
  await expect(t.mutation(internal.publicationGrants.issue, { destinationKey: 'trailer-feed', versionId: first, allowedOrigins: ['https://portfolio.example'] })).rejects.toThrow('GRANT_VERSION_UNAVAILABLE');
});

test('a grant expiry is enforced on delivery and cannot be extended by an issuance retry', async () => {
  const { t, first } = await videoFixture();
  const expiresAt = Date.now() + 60000;
  const consent = { destinationKey: 'trailer-feed' as const, versionId: first, allowedOrigins: ['https://portfolio.example'], expiresAt };
  const grant = await t.mutation(internal.publicationGrants.issue, consent);
  expect(grant.expiresAt).toBe(expiresAt);
  const now = spyOn(Date, 'now').mockReturnValue(expiresAt);
  try {
    expect(await t.query(internal.publicationGrants.resolve, { slug: grant.slug, versionId: first, variant: 'original' })).toBeNull();
    await expect(t.mutation(internal.publicationGrants.issue, { ...consent, expiresAt: expiresAt + 60000 })).rejects.toThrow('GRANT_EXPIRED');
  } finally { now.mockRestore(); }
});

test('publication consent pins only the explicitly selected ready image versions', async () => {
  const t = convexTest(schema, modules);
  const { root, selected, other } = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'References', slug: 'references', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Clip', originalFilename: 'clip.mp4', storageKey: 'private/clip.mp4', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const root = await ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: 'private/clip.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 1 });
    const image = await ctx.db.insert('videos', { projectId: project, title: 'Reference', originalFilename: 'reference.png', storageKey: 'private/image.png', mimeType: 'image/png', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 1, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const selected = await ctx.db.insert('assetVersions', { assetId: image, version: 1, originalKey: 'private/image-first.png', mimeType: 'image/png', sizeBytes: 10, processingState: 'ready', createdAt: 1 });
    const other = await ctx.db.insert('assetVersions', { assetId: image, version: 2, originalKey: 'private/image-second.png', mimeType: 'image/png', sizeBytes: 10, processingState: 'ready', createdAt: 2 });
    return { root, selected, other };
  });
  const consent = { destinationKey: 'trailer-feed' as const, versionId: root, referenceVersionIds: [selected], allowedOrigins: ['https://portfolio.example'] };
  await t.run(ctx => ctx.db.patch(selected, { processingState: 'processing' }));
  await expect(t.mutation(internal.publicationGrants.issue, consent)).rejects.toThrow('GRANT_MEDIA_NOT_READY');
  await t.run(ctx => ctx.db.patch(selected, { processingState: 'ready' }));
  await expect(t.mutation(internal.publicationGrants.issue, { ...consent, referenceVersionIds: [root] })).rejects.toThrow('GRANT_REFERENCE_UNAVAILABLE');
  const grant = await t.mutation(internal.publicationGrants.issue, consent);
  expect(grant.referenceVersionIds).toEqual([selected]);
  expect((await t.query(internal.publicationGrants.resolve, { slug: grant.slug, versionId: selected, variant: 'original' }))?.key).toBe('private/image-first.png');
  expect(await t.query(internal.publicationGrants.resolve, { slug: grant.slug, versionId: other, variant: 'original' })).toBeNull();
  await expect(t.mutation(internal.publicationGrants.issue, { ...consent, referenceVersionIds: [other] })).rejects.toThrow('GRANT_CONSENT_CHANGED');
  await t.run(ctx => ctx.db.delete(selected));
  expect(await t.query(internal.publicationGrants.resolve, { slug: grant.slug, versionId: selected, variant: 'original' })).toBeNull();
  expect((await t.query(internal.publicationGrants.resolve, { slug: grant.slug, versionId: root, variant: 'original' }))?.key).toBe('private/clip.mp4');
});
