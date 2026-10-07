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
  const replacementStatuses = ids.versions.map(versionId => ({ versionId, state: 'target_suppressed' as const, consentGeneration: 1 }));
  const replacement = await t.mutation(internal.destinationSync.saveConnection, { projectId: ids.project, destinationKey: 'trailer-feed', targetRunId: 'new-target', replacesConnectionId: old, replacementStatuses });
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

test('replacement observes mixed target states and only reactivates the version that actually reached the old target', async () => {
  jest.useFakeTimers();
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Queued replacement', slug: 'queued-replacement', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Synthetic', originalFilename: 'synthetic.mp4', storageKey: 'PRIVATE', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const versions = [];
    for (let number = 1; number <= 2; number++) versions.push(await ctx.db.insert('assetVersions', { assetId: asset, version: number, originalKey: `PRIVATE-${number}`, mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: number }));
    return { project, asset, versions };
  });
  const old = await t.mutation(internal.destinationSync.saveConnection, { projectId: ids.project, destinationKey: 'trailer-feed', targetRunId: 'deleted-mixed-target' });
  const selection = ids.versions.map(versionId => ({ versionId, expectedMetadataUpdatedAt: null }));
  await t.mutation(internal.destinationSync.confirm, { connectionId: old, confirmationId: 'mixed-old-consent', versions: selection });
  const transport = globalThis.fetch;
  const key = process.env.TRAILER_FEED_REVIEW_INGEST_KEY;
  process.env.TRAILER_FEED_REVIEW_INGEST_KEY = 'fixture-only';
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body));
    if (String(input).endsWith('/status')) {
      expect(payload.versions).toHaveLength(2);
      return Response.json({ versions: payload.versions.map((version: Record<string, string>, index: number) => ({ ...version, state: index === 1 ? 'target_suppressed' : 'unregistered', ...(index === 1 ? { consent_generation: 1 } : {}) })) });
    }
    expect(String(input).endsWith('/connections')).toBe(true);
    expect(payload.expected_run_id).toBe('deleted-mixed-target');
    return Response.json({ source_project_id: ids.project, source_folder_id: '__root__', run_id: 'new-mixed-target' });
  }) as unknown as typeof fetch;
  try {
    const replacement = await t.action(internal.destinationDelivery.connect, { destinationKey: 'trailer-feed', projectId: ids.project, mode: 'create', targetTitle: 'New mixed target', replacesConnectionId: old, replacementId: 'mixed-replacement' });
    const retired = await t.query(internal.destinationSync.snapshot, { projectId: ids.project });
    expect(retired.items.every(item => item.state === 'disconnected')).toBe(true);
    const fresh = await t.mutation(internal.destinationSync.confirm, { connectionId: replacement.connectionId, confirmationId: 'mixed-fresh-consent', versions: selection });
    const claim = await t.mutation(internal.destinationSync.claimBatch, { batchId: fresh.batchId });
    const reactivations = JSON.parse(claim!.reactivationJson!);
    expect(reactivations).toHaveLength(2);
    expect(reactivations.map((intent: { intent: string }) => intent.intent)).toEqual(['reserve-fresh', 'sync-again']);
    expect(reactivations[0].versions[0].source_version_id).toBe(ids.versions[0]);
    expect(reactivations[1].source_version_id).toBe(ids.versions[1]);
    const reserved = JSON.parse(claim!.reservationJson).versions;
    expect(reserved.map((version: { source_version_id: string; consent_generation: number }) => [version.source_version_id, version.consent_generation])).toEqual(ids.versions.map(id => [id, 2]));
    const cancelled = (await t.query(internal.destinationSync.snapshot, { projectId: ids.project })).items.find(item => item.batchId === fresh.batchId && item.versionId === ids.versions[1])!;
    await t.mutation(internal.destinationUnsync.confirm, { jobId: cancelled.id, expectedGeneration: 2 });
    await t.mutation(internal.destinationSync.finishReservation, { batchId: fresh.batchId, token: claim!.token, ok: true });
    const renewed = await t.mutation(internal.destinationSync.claimBatch, { batchId: fresh.batchId });
    expect(renewed).not.toBeNull();
    const remainingPlan = JSON.parse(renewed!.reactivationJson!);
    expect(remainingPlan).toHaveLength(1);
    expect(remainingPlan[0].intent).toBe('reserve-fresh');
    expect(remainingPlan[0].versions[0].source_version_id).toBe(ids.versions[0]);
    expect(remainingPlan[0].batch_id).not.toBe(reactivations[0].batch_id);
    expect(JSON.parse(renewed!.reservationJson).versions.map((version: { source_version_id: string }) => version.source_version_id)).toEqual([ids.versions[0]]);
    expect(await t.mutation(internal.destinationSync.claimItem, { jobId: cancelled.id })).toBeNull();
  } finally { globalThis.fetch = transport; if (key === undefined) delete process.env.TRAILER_FEED_REVIEW_INGEST_KEY; else process.env.TRAILER_FEED_REVIEW_INGEST_KEY = key; }
});
