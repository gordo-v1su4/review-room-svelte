import { test, expect, jest, afterEach } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';

const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })].map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('explicit replacement preserves retired mapping, fences old acknowledgments and publishes only fresh exact consent', async () => {
  jest.useFakeTimers();
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Replacement QA', slug: 'replacement-qa', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const versions = [];
    for (let number = 1; number <= 2; number++) {
      const asset = await ctx.db.insert('videos', { projectId: project, title: `Clip ${number}`, originalFilename: `clip-${number}.mp4`, storageKey: `PRIVATE-${number}`, mimeType: 'video/mp4', processingStatus: 'ready', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: number, uploadedBy: owner, uploadedAt: number, updatedAt: number });
      const version = await ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: `PRIVATE-${number}`, mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: number });
      await ctx.db.patch(asset, { currentVersionId: version });
      versions.push(version);
    }
    return { project, versions };
  });
  const old = await t.mutation(internal.destinationSync.saveConnection, { projectId: ids.project, destinationKey: 'trailer-feed', targetRunId: 'deleted-target' });
  const selection = ids.versions.map(versionId => ({ versionId, expectedMetadataUpdatedAt: null }));
  const confirmed = await t.mutation(internal.destinationSync.confirm, { connectionId: old, confirmationId: 'old-consent', versions: selection });
  const reservation = await t.mutation(internal.destinationSync.claimBatch, { batchId: confirmed.batchId });
  await t.mutation(internal.destinationSync.finishReservation, { batchId: confirmed.batchId, token: reservation!.token, ok: true });
  const before = await t.query(internal.destinationSync.snapshot, { projectId: ids.project });
  const oldClaim = await t.mutation(internal.destinationSync.claimItem, { jobId: before.items[0].id });
  expect(oldClaim).not.toBeNull();
  await expect(t.mutation(internal.destinationSync.saveConnection, { projectId: ids.project, destinationKey: 'trailer-feed', targetRunId: 'new-target' })).rejects.toThrow();
  const replacement = await t.mutation(internal.destinationSync.saveConnection, { projectId: ids.project, destinationKey: 'trailer-feed', targetRunId: 'new-target', replacesConnectionId: old });
  expect(await t.mutation(internal.destinationSync.saveConnection, { projectId: ids.project, destinationKey: 'trailer-feed', targetRunId: 'new-target', replacesConnectionId: old })).toBe(replacement);
  await t.mutation(internal.destinationSync.finishItem, { jobId: before.items[0].id, token: oldClaim!.token, ok: true, targetArtifactId: 'late-old-ack', targetVersionNumber: 1 });
  const retired = await t.query(internal.destinationSync.snapshot, { projectId: ids.project });
  expect(retired.connections).toHaveLength(2);
  expect(retired.connections.find(item => item._id === old)?.replacedByConnectionId).toBe(replacement);
  expect(retired.connections.find(item => item._id === replacement)?.replacesConnectionId).toBe(old);
  expect(retired.items.every(item => item.state === 'disconnected' && item.targetArtifactId !== 'late-old-ack')).toBe(true);
  expect(await t.mutation(internal.destinationSync.claimItem, { jobId: before.items[0].id })).toBeNull();
  await expect(t.mutation(internal.destinationSync.confirm, { connectionId: old, confirmationId: 'old-connection-new-consent', versions: selection })).rejects.toThrow();
  const next = await t.mutation(internal.destinationSync.confirm, { connectionId: replacement, confirmationId: 'new-consent', versions: selection });
  const after = await t.query(internal.destinationSync.snapshot, { projectId: ids.project });
  expect(after.items.filter(item => item.connectionId === replacement).map(item => item.consentGeneration)).toEqual([2, 2]);
  expect(after.items).toHaveLength(4);
  const nextClaim = await t.mutation(internal.destinationSync.claimBatch, { batchId: next.batchId });
  const reactivations = JSON.parse(nextClaim!.reactivationJson!);
  expect(reactivations).toHaveLength(2);
  expect(reactivations.map((item: { expected_generation: number; consent_generation: number; run_id: string }) => [item.expected_generation, item.consent_generation, item.run_id])).toEqual([[1, 2, 'new-target'], [1, 2, 'new-target']]);
  expect(JSON.parse(nextClaim!.reservationJson).versions.map((item: { source_version_id: string }) => item.source_version_id)).toEqual(ids.versions);
  expect((await t.mutation(internal.destinationSync.confirm, { connectionId: replacement, confirmationId: 'new-consent', versions: selection })).batchId).toBe(next.batchId);
});
