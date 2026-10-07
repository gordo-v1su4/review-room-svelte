import { test, expect, jest, beforeEach, afterEach } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';
const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })].map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));
beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Refresh', slug: 'refresh', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Clip', originalFilename: 'clip.mp4', storageKey: 'private/video', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const version = await ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: 'private/video', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 1, metadataUpdatedAt: 10, creativeMetadata: { sourceLabel: '', model: 'Source model', prompt: 'Fill empty', referenceImageVersionIds: [] } });
    await ctx.db.patch(asset, { currentVersionId: version });
    return { project, asset, version };
  });
  const connectionId = await t.mutation(internal.destinationSync.saveConnection, { destinationKey: 'trailer-feed', projectId: ids.project, targetRunId: 'target' });
  await t.mutation(internal.destinationSync.confirm, { connectionId, confirmationId: 'initial', versions: [{ versionId: ids.version, expectedMetadataUpdatedAt: 10 }] });
  const batch = await t.query(internal.destinationSync.snapshot, { projectId: ids.project });
  const claim = await t.mutation(internal.destinationSync.claimBatch, { batchId: batch.batches[0]._id });
  await t.mutation(internal.destinationSync.finishReservation, { batchId: batch.batches[0]._id, token: claim!.token, ok: true });
  const job = batch.items[0];
  const delivery = await t.mutation(internal.destinationSync.claimItem, { jobId: job.id });
  await t.mutation(internal.destinationSync.finishItem, { jobId: job.id, token: delivery!.token, ok: true, targetArtifactId: 'artifact', targetVersionNumber: 1 });
  return { t, ...ids, job, rootPayload: JSON.parse(delivery!.payloadJson) };
}
test('owner Refresh freezes revision and retries the same operation without rotating published media', async () => {
  const { t, project, version, job, rootPayload } = await fixture();
  const consent = { jobId: job.id, operationId: 'refresh-1', expectedGeneration: 1, expectedMetadataUpdatedAt: 10 };
  const operation = await t.mutation(internal.destinationRefresh.confirm, consent);
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: version, expectedUpdatedAt: 10, metadata: { sourceLabel: '', model: 'Later edit', prompt: 'Later', referenceImageVersionIds: [] } });
  expect(await t.mutation(internal.destinationRefresh.confirm, consent)).toEqual(operation);
  const claim = await t.mutation(internal.destinationRefresh.claim, { refreshId: operation.refreshId });
  const payload = JSON.parse(claim!.payloadJson);
  expect(payload.metadata.prompt).toBe('Fill empty');
  expect(payload.media_url).toBe(rootPayload.media_url);
  expect(payload.consent_generation).toBe(1);
  await t.mutation(internal.destinationRefresh.finish, { refreshId: operation.refreshId, token: claim!.token, ok: false });
  const snapshot = await t.query(internal.destinationRefresh.snapshot, { projectId: project });
  expect(snapshot[0].state).toBe('failed');
  expect(JSON.stringify(snapshot)).not.toContain('/api/destination-media/');
  await t.mutation(internal.destinationRefresh.retry, { refreshId: operation.refreshId });
  const retry = await t.mutation(internal.destinationRefresh.claim, { refreshId: operation.refreshId });
  expect(retry!.payloadJson).toBe(claim!.payloadJson);
});

test('explicit image Refresh grants only exact ready images and revokes auxiliary access with the root', async () => {
  const { t, project, asset, version, job, rootPayload } = await fixture();
  const image = await t.run(async ctx => {
    const source = await ctx.db.get(asset);
    const imageAsset = await ctx.db.insert('videos', { ...Object.fromEntries(Object.entries(source!).filter(([key]) => !['_id', '_creationTime', 'currentVersionId'].includes(key))) as Omit<NonNullable<typeof source>, '_id' | '_creationTime'>, title: 'Image', assetClass: 'IMG', mimeType: 'image/png' });
    return ctx.db.insert('assetVersions', { assetId: imageAsset, version: 1, originalKey: 'private/image.png', mimeType: 'image/png', sizeBytes: 10, processingState: 'ready', createdAt: 1 });
  });
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: version, expectedUpdatedAt: 10, metadata: { sourceLabel: '', model: 'Source model', prompt: 'Fill empty', gridImageVersionId: image, referenceImageVersionIds: [] } });
  const revision = (await t.query(internal.destinationSync.workspace, { projectId: project })).versions.find(v => v.versionId === version)!.expectedMetadataUpdatedAt;
  const operation = await t.mutation(internal.destinationRefresh.confirm, { jobId: job.id, operationId: 'image-refresh', expectedGeneration: 1, expectedMetadataUpdatedAt: revision });
  const claim = await t.mutation(internal.destinationRefresh.claim, { refreshId: operation.refreshId });
  const payload = JSON.parse(claim!.payloadJson);
  expect(payload.media_url).toBe(rootPayload.media_url);
  const slug = new URL(payload.grid.media_url).pathname.split('/')[3];
  const rootSlug = new URL(rootPayload.media_url).pathname.split('/')[3];
  expect(slug).not.toBe(rootSlug);
  expect((await t.query(internal.publicationGrants.resolve, { slug, versionId: image, variant: 'original' }))?.key).toBe('private/image.png');
  expect(await t.query(internal.publicationGrants.resolve, { slug, versionId: version, variant: 'original' })).toBeNull();
  expect(await t.query(internal.publicationGrants.resolve, { slug: rootSlug, versionId: image, variant: 'original' })).toBeNull();
  const grant = await t.run(ctx => ctx.db.query('publicationGrants').withIndex('by_slug', q => q.eq('slug', rootSlug)).unique());
  await t.mutation(internal.publicationGrants.revoke, { grantId: grant!._id, expectedGeneration: 1 });
  expect(await t.query(internal.publicationGrants.resolve, { slug, versionId: image, variant: 'original' })).toBeNull();
  await t.mutation(internal.destinationRefresh.finish, { refreshId: operation.refreshId, token: claim!.token, ok: true });
  expect((await t.query(internal.destinationRefresh.snapshot, { projectId: grant!.projectId }))[0].state).toBe('disconnected');
});



