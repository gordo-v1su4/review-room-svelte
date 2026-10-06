import { test, expect, mock, jest, beforeEach, afterEach } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';

const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })]
  .map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Sync', slug: 'sync', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Clip', originalFilename: 'clip.mp4', storageKey: 'assets/private/clip.mp4', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const first = await ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: 'assets/private/first.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 100, metadataUpdatedAt: 11, creativeMetadata: { model: 'Sora 2', prompt: 'Original first take', sourceLabel: 'Original V1', referenceImageVersionIds: [] } });
    const second = await ctx.db.insert('assetVersions', { assetId: asset, version: 2, originalKey: 'assets/private/second.mp4', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: 200 });
    await ctx.db.patch(asset, { currentVersionId: second });
    return { project, asset, first, second };
  });
  return { t, ...ids };
}

test('explicit ordered confirmation durably pins selected versions and metadata across reload and response replay', async () => {
  const { t, project, first, second } = await fixture();
  const connectionId = await t.mutation(internal.destinationSync.saveConnection, { projectId: project, destinationKey: 'trailer-feed', targetRunId: 'connected-target' });
  const workspace = await t.query(internal.destinationSync.workspace, { projectId: project });
  expect(workspace.versions.map(item => item.versionId)).toEqual([first, second]);
  expect(workspace.versions[0].expectedMetadataUpdatedAt).toBe(11);
  expect(JSON.stringify(workspace)).not.toContain('assets/private/');
  expect((await t.query(internal.destinationSync.snapshot, { projectId: project })).items).toEqual([]);
  const selection = { connectionId, confirmationId: 'explicit-confirmation-1', versions: [{ versionId: second, expectedMetadataUpdatedAt: null }, { versionId: first, expectedMetadataUpdatedAt: 11 }] };
  const confirmed = await t.mutation(internal.destinationSync.confirm, selection);
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: first, expectedUpdatedAt: 11, metadata: { model: 'Edited later', prompt: 'Changed after confirmation', sourceLabel: '', referenceImageVersionIds: [] } });
  const reloaded = await t.query(internal.destinationSync.snapshot, { projectId: project });
  expect(reloaded.items.map(item => item.versionId)).toEqual([first, second]);
  expect(reloaded.items.map(item => item.state)).toEqual(['queued', 'queued']);
  expect(reloaded.items[0].model).toBe('Sora 2');
  expect(reloaded.items[0].prompt).toBe('Original first take');
  expect(JSON.stringify(reloaded)).not.toContain('assets/private/');
  expect((await t.mutation(internal.destinationSync.confirm, selection)).batchId).toBe(confirmed.batchId);
  expect((await t.query(internal.destinationSync.snapshot, { projectId: project })).items).toHaveLength(2);
});

test('owner connection records the verified target identity without publishing any versions', async () => {
  const { t, project } = await fixture();
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.TRAILER_FEED_REVIEW_INGEST_KEY;
  process.env.TRAILER_FEED_REVIEW_INGEST_KEY = 'fixture-ingest-only';
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toBe('https://media.v1su4.dev/trailer-feed/external/review/connections');
    expect(JSON.parse(String(init?.body))).toEqual({ source_project_id: project, source_folder_id: '__root__', mode: 'create', title: 'Confirmed target name' });
    return Response.json({ source_project_id: project, source_folder_id: '__root__', run_id: 'verified-target' }, { status: 201 });
  }) as unknown as typeof fetch;
  try {
    const result = await t.action(internal.destinationDelivery.connect, { destinationKey: 'trailer-feed', projectId: project, mode: 'create', targetTitle: 'Confirmed target name' });
    const snapshot = await t.query(internal.destinationSync.snapshot, { projectId: project });
    expect(snapshot.connections[0]._id).toBe(result.connectionId);
    expect(snapshot.connections[0].targetRunId).toBe('verified-target');
    expect(snapshot.items).toEqual([]);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.TRAILER_FEED_REVIEW_INGEST_KEY; else process.env.TRAILER_FEED_REVIEW_INGEST_KEY = oldKey;
  }
});

test('queued publication stops when a selected reference image is archived before delivery', async () => {
  const { t, project, asset, first } = await fixture();
  const image = await t.run(async ctx => {
    const original = await ctx.db.get(asset);
    const imageAsset = await ctx.db.insert('videos', { ...Object.fromEntries(Object.entries(original!).filter(([key]) => !['_id', '_creationTime', 'currentVersionId'].includes(key))) as Omit<NonNullable<typeof original>, '_id' | '_creationTime'>, title: 'Reference image', mimeType: 'image/png', storageKey: 'assets/private/reference.png' });
    const imageVersion = await ctx.db.insert('assetVersions', { assetId: imageAsset, version: 1, originalKey: 'assets/private/reference.png', mimeType: 'image/png', sizeBytes: 100, processingState: 'ready', createdAt: 50 });
    await ctx.db.patch(first, { creativeMetadata: { model: 'Sora 2', prompt: 'Original first take', sourceLabel: 'Original V1', referenceImageVersionIds: [imageVersion] } });
    return imageAsset;
  });
  const connectionId = await t.mutation(internal.destinationSync.saveConnection, { projectId: project, destinationKey: 'trailer-feed', targetRunId: 'connected-target' });
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.TRAILER_FEED_REVIEW_INGEST_KEY;
  process.env.TRAILER_FEED_REVIEW_INGEST_KEY = 'fixture-ingest-only';
  const delivered: string[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body));
    if (String(input).endsWith('/batches')) {
      await t.run(ctx => ctx.db.patch(image, { status: 'archived' }));
      return Response.json({ batch_id: payload.batch_id, versions: payload.versions.map((item: Record<string, unknown>) => ({ ...item, version_number: 1, artifact_id: 'review-target-1', state: 'reserved' })) }, { status: 201 });
    }
    delivered.push(payload.source_version_id);
    return Response.json({ artifact: { artifact_id: 'review-target-1', version_number: 1, source_app: 'review-room', source_asset_id: asset, source_version_id: first, consent_generation: 1 } }, { status: 201 });
  }) as unknown as typeof fetch;
  try {
    await t.mutation(internal.destinationSync.confirm, { connectionId, confirmationId: 'reference-consent', versions: [{ versionId: first, expectedMetadataUpdatedAt: 11 }] });
    await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    expect(delivered).toEqual([]);
    expect((await t.query(internal.destinationSync.snapshot, { projectId: project })).items[0].state).toBe('disconnected');
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.TRAILER_FEED_REVIEW_INGEST_KEY; else process.env.TRAILER_FEED_REVIEW_INGEST_KEY = oldKey;
  }
});

test('durable delivery reserves the whole batch first and retry sends only the two failures after eight successes', async () => {
  const { t, project, asset, first, second } = await fixture();
  const versions = [first, second, ...await t.run(async ctx => {
    const result = [];
    for (let number = 3; number <= 10; number++) result.push(await ctx.db.insert('assetVersions', { assetId: asset, version: number, originalKey: `assets/private/${number}.mp4`, mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: number * 100 }));
    return result;
  })];
  const connectionId = await t.mutation(internal.destinationSync.saveConnection, { projectId: project, destinationKey: 'trailer-feed', targetRunId: 'connected-target' });
  let reserved = false;
  let failing = true;
  const delivered: string[] = [];
  const oldKey = process.env.TRAILER_FEED_REVIEW_INGEST_KEY;
  process.env.TRAILER_FEED_REVIEW_INGEST_KEY = 'fixture-ingest-only';
  const oldFetch = globalThis.fetch;
  const transport = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer fixture-ingest-only' });
    const payload = JSON.parse(String(init?.body));
    if (String(input).endsWith('/batches')) {
      expect(payload.versions.map((item: { source_version_id: string }) => item.source_version_id)).toEqual(versions);
      reserved = true;
      return Response.json({ batch_id: payload.batch_id, versions: payload.versions.map((item: Record<string, unknown>, index: number) => ({ ...item, version_number: index + 1, artifact_id: `review-target-${index + 1}`, state: 'reserved' })) }, { status: 201 });
    }
    expect(reserved).toBe(true);
    expect(String(input)).toBe('https://media.v1su4.dev/trailer-feed/external/review/versions');
    const number = versions.indexOf(payload.source_version_id) + 1;
    delivered.push(payload.source_version_id);
    if (failing && (number === 4 || number === 9)) return Response.json({ error: 'Temporary target failure' }, { status: 503 });
    return Response.json({ artifact: { artifact_id: `review-target-${number}`, version_number: number, source_app: 'review-room', source_asset_id: asset, source_version_id: payload.source_version_id, consent_generation: 1 } }, { status: 201 });
  });
  globalThis.fetch = transport as unknown as typeof fetch;
  try {
    const confirmed = await t.mutation(internal.destinationSync.confirm, { connectionId, confirmationId: 'ten-version-batch', versions: [...versions].reverse().map(versionId => ({ versionId, expectedMetadataUpdatedAt: versionId === first ? 11 : null })) });
    await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    const reloaded = await t.query(internal.destinationSync.snapshot, { projectId: project });
    expect(reloaded.items.filter(item => item.state === 'synced')).toHaveLength(8);
    expect(reloaded.items.filter(item => item.state === 'failed').map(item => item.versionId)).toEqual([versions[3], versions[8]]);
    expect(delivered).toHaveLength(10);
    failing = false;
    delivered.length = 0;
    await t.mutation(internal.destinationSync.retry, { batchId: confirmed.batchId });
    await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    expect(delivered.sort()).toEqual([versions[3], versions[8]].sort());
    expect((await t.query(internal.destinationSync.snapshot, { projectId: project })).items.every(item => item.state === 'synced')).toBe(true);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.TRAILER_FEED_REVIEW_INGEST_KEY; else process.env.TRAILER_FEED_REVIEW_INGEST_KEY = oldKey;
  }
});

test('workspace reconciliation persists target removal and retry never republishes the disconnected version', async () => {
  const { t, project, asset, first } = await fixture();
  const connectionId = await t.mutation(internal.destinationSync.saveConnection, { projectId: project, destinationKey: 'trailer-feed', targetRunId: 'connected-target' });
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.TRAILER_FEED_REVIEW_INGEST_KEY;
  process.env.TRAILER_FEED_REVIEW_INGEST_KEY = 'fixture-ingest-only';
  let deliveries = 0;
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body));
    if (String(input).endsWith('/batches')) return Response.json({ batch_id: payload.batch_id, versions: payload.versions.map((item: Record<string, unknown>) => ({ ...item, version_number: 1, artifact_id: 'review-target-1', state: 'reserved' })) });
    if (String(input).endsWith('/status')) {
      expect(payload.versions).toEqual([{ source_asset_id: asset, source_version_id: first }]);
      return Response.json({ versions: [{ source_asset_id: asset, source_version_id: first, state: 'target_suppressed', consent_generation: 1, run_id: 'connected-target', artifact_id: 'review-target-1', version_number: 1 }] });
    }
    deliveries++;
    return Response.json({ artifact: { artifact_id: 'review-target-1', version_number: 1, source_app: 'review-room', source_asset_id: asset, source_version_id: first, consent_generation: 1 } });
  }) as unknown as typeof fetch;
  try {
    const confirmed = await t.mutation(internal.destinationSync.confirm, { connectionId, confirmationId: 'target-removal-consent', versions: [{ versionId: first, expectedMetadataUpdatedAt: 11 }] });
    await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    expect((await t.query(internal.destinationSync.snapshot, { projectId: project })).items[0].state).toBe('synced');
    await t.action(internal.destinationDelivery.reconcile, { projectId: project });
    expect((await t.query(internal.destinationSync.snapshot, { projectId: project })).items[0].state).toBe('disconnected');
    await t.mutation(internal.destinationSync.retry, { batchId: confirmed.batchId });
    await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    expect(deliveries).toBe(1);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.TRAILER_FEED_REVIEW_INGEST_KEY; else process.env.TRAILER_FEED_REVIEW_INGEST_KEY = oldKey;
  }
});

test('explicit Sync again rotates exact-version consent once and safely retries a lost reactivation response', async () => {
  const { t, project, asset, first, second } = await fixture();
  const connectionId = await t.mutation(internal.destinationSync.saveConnection, { projectId: project, destinationKey: 'trailer-feed', targetRunId: 'connected-target' });
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.TRAILER_FEED_REVIEW_INGEST_KEY;
  process.env.TRAILER_FEED_REVIEW_INGEST_KEY = 'fixture-ingest-only';
  let lostResponse = true;
  let generation = 1;
  let state = 'registered';
  const deliveries: { versionId:string; generation:number; url:string }[] = [];
  const reactivationIds: string[] = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body));
    if (String(input).endsWith('/status')) return Response.json({ versions: [{ source_asset_id: asset, source_version_id: first, state, consent_generation: generation, run_id: 'connected-target', artifact_id: 'review-target-1', version_number: 1 }] });
    if (String(input).endsWith('/reactivations')) {
      expect(payload.intent).toBe('sync-again');
      expect(payload.expected_generation).toBe(1);
      expect(payload.consent_generation).toBe(2);
      expect(payload.source_version_id).toBe(first);
      reactivationIds.push(payload.batch_id);
      generation = 2; state = 'reserved';
      if (lostResponse) { lostResponse = false; throw new TypeError('Lost external response'); }
      return Response.json({ batch_id: payload.batch_id, consent_generation: 2, version_number: 1 });
    }
    if (String(input).endsWith('/batches')) {
      expect(payload.versions.map((item: { source_version_id:string }) => item.source_version_id)).toEqual([first]);
      expect(payload.versions[0].consent_generation).toBe(generation);
      expect(reactivationIds).not.toContain(payload.batch_id);
      return Response.json({ batch_id: payload.batch_id, versions: payload.versions.map((item: Record<string, unknown>) => ({ ...item, version_number: 1, artifact_id: 'review-target-1', state: 'reserved' })) });
    }
    deliveries.push({ versionId: payload.source_version_id, generation: payload.consent_generation, url: payload.media_url });
    state = 'registered';
    return Response.json({ artifact: { artifact_id: 'review-target-1', version_number: 1, source_app: 'review-room', source_asset_id: asset, source_version_id: first, consent_generation: generation } });
  }) as unknown as typeof fetch;
  try {
    await t.mutation(internal.destinationSync.confirm, { connectionId, confirmationId: 'original-publication', versions: [{ versionId: first, expectedMetadataUpdatedAt: 11 }] });
    await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    state = 'target_suppressed';
    await t.action(internal.destinationDelivery.reconcile, { projectId: project });
    const consent = { connectionId, confirmationId: 'deliberate-republication', versionId: first, expectedGeneration: 1, expectedMetadataUpdatedAt: 11 };
    const confirmed = await t.mutation(internal.destinationSync.syncAgain, consent);
    expect((await t.mutation(internal.destinationSync.syncAgain, consent)).batchId).toBe(confirmed.batchId);
    await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    expect((await t.query(internal.destinationSync.snapshot, { projectId: project })).items.find(item => item.consentGeneration === 2)?.state).toBe('failed');
    await t.mutation(internal.destinationSync.retry, { batchId: confirmed.batchId });
    await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    expect(reactivationIds).toHaveLength(2);
    expect(reactivationIds[0]).toBe(reactivationIds[1]);
    expect(deliveries.map(item => [item.versionId, item.generation])).toEqual([[first, 1], [first, 2]]);
    expect(deliveries[1].url).not.toBe(deliveries[0].url);
    expect(deliveries.some(item => item.versionId === second)).toBe(false);
    const snapshot = await t.query(internal.destinationSync.snapshot, { projectId: project });
    expect(snapshot.items).toHaveLength(2);
    expect(snapshot.items.find(item => item.consentGeneration === 2)?.state).toBe('synced');
    expect(snapshot.items.find(item => item.consentGeneration === 2)?.targetVersionNumber).toBe(1);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.TRAILER_FEED_REVIEW_INGEST_KEY; else process.env.TRAILER_FEED_REVIEW_INGEST_KEY = oldKey;
  }
});

test('removal before initial delivery can be reconciled for explicit exact-version reactivation', async () => {
  const { t, project, asset, first } = await fixture();
  const connectionId = await t.mutation(internal.destinationSync.saveConnection, { projectId: project, destinationKey: 'trailer-feed', targetRunId: 'connected-target' });
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.TRAILER_FEED_REVIEW_INGEST_KEY;
  process.env.TRAILER_FEED_REVIEW_INGEST_KEY = 'fixture-ingest-only';
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body));
    if (String(input).endsWith('/batches')) return Response.json({ batch_id: payload.batch_id, versions: payload.versions.map((item: Record<string, unknown>) => ({ ...item, version_number: 1, artifact_id: 'review-target-1', state: 'reserved' })) });
    if (String(input).endsWith('/status')) return Response.json({ versions: [{ source_asset_id: asset, source_version_id: first, state: 'target_suppressed', consent_generation: 1, run_id: 'connected-target', artifact_id: 'review-target-1', version_number: 1 }] });
    return Response.json({ error: 'Suppressed after reservation' }, { status: 409 });
  }) as unknown as typeof fetch;
  try {
    await t.mutation(internal.destinationSync.confirm, { connectionId, confirmationId: 'removed-before-delivery', versions: [{ versionId: first, expectedMetadataUpdatedAt: 11 }] });
    await t.finishAllScheduledFunctions(() => jest.runAllTimers());
    expect((await t.query(internal.destinationSync.snapshot, { projectId: project })).items[0].state).toBe('disconnected');
    await t.action(internal.destinationDelivery.reconcile, { projectId: project });
    expect((await t.query(internal.destinationSync.snapshot, { projectId: project })).items[0].canSyncAgain).toBe(true);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.TRAILER_FEED_REVIEW_INGEST_KEY; else process.env.TRAILER_FEED_REVIEW_INGEST_KEY = oldKey;
  }
});
