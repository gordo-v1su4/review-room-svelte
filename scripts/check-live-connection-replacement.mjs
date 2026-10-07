import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';

const origin = 'https://review.v1su4.dev';
const target = 'https://media.v1su4.dev/trailer-feed';
const fixture = JSON.parse(readFileSync('.scratch/release-readiness/activity-observation.json.local', 'utf8'));
const recovery = JSON.parse(readFileSync('.scratch/release-readiness/source-outbox-recovery.json.local', 'utf8'));
const statePath = '.scratch/release-readiness/connection-replacement.json.local';
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { projectId: fixture.projectId, folderId: fixture.folderId, oldConnectionId: fixture.connectionId, oldTargetRunId: fixture.targetRunId, replacementId: randomUUID(), confirmationId: randomUUID() };
const persist = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
assert(state.oldTargetRunId === fixture.targetRunId && state.projectId === recovery.projectId, 'Synthetic replacement fixture identity changed');
const c = new ConvexHttpClient('https://review-convex.v1su4.dev');
c.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const login = await fetch(origin + '/studio/sign-in?/email', { method: 'POST', redirect: 'manual', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: 'gordo@v1su4.com', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
const cookie = login.headers.get('set-cookie')?.split(';')[0];
assert(cookie, 'Owner session unavailable');
async function owner(body) {
  return fetch(origin + '/api/owner-sync', { method: 'POST', redirect: 'manual', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
async function scope() {
  const response = await fetch(origin + `/api/owner-sync?projectId=${state.projectId}&folderId=${state.folderId}`, { headers: { cookie } });
  assert(response.ok, 'Owner replacement scope unavailable');
  return response.json();
}
async function catalog(runId) {
  const response = await fetch(target + `/data/comparisons/${runId}/artifacts.json`);
  assert(response.ok, 'Synthetic target catalog unavailable');
  return response.json();
}
const versionIds = [fixture.versionId, recovery.versionId];
const mode = process.argv[2];
if (mode === '--delete-disposable-target') {
  assert(!state.deleted, 'Disposable target was already removed; do not repeat publication setup');
  const runResponse = await fetch(target + `/data/comparisons/${state.oldTargetRunId}/run.json`);
  assert(runResponse.ok, 'Old disposable target unavailable');
  const run = await runResponse.json();
  assert.equal(run.title, 'Activity panel QA 2026-10-07', 'Refusing to delete a non-QA target');
  const artifacts = await catalog(state.oldTargetRunId);
  const videos = artifacts.filter(item => item.artifact_type === 'video_result');
  const videoArtifactIds = new Set(videos.map(item => item.artifact_id));
  assert(videos.length === 2 && new Set(videos.map(item => item.source_version_id)).size === 2 && videos.every(item => versionIds.includes(item.source_version_id)) && artifacts.length <= 24 && artifacts.every(item => item.ownership === 'external' && item.source_app === 'review-room' && (versionIds.includes(item.source_version_id) || videoArtifactIds.has(item.source_parent_artifact_id))), 'Disposable target ownership/content changed');
  const source = await c.query('personal:snapshot', {});
  state.originals = versionIds.map(versionId => {
    const version = source.versions.find(item => item._id === versionId);
    const asset = source.assets.find(item => item._id === version?.assetId);
    assert(version && asset?.projectId === state.projectId && asset.folderId === state.folderId, 'Synthetic originals changed');
    return { assetId: asset._id, versionId, originalKey: version.originalKey, sourceCreatedAt: version.creativeMetadata?.sourceCreatedAt ?? version.createdAt, metadata: version.creativeMetadata, metadataUpdatedAt: version.metadataUpdatedAt };
  });
  state.oldArtifacts = artifacts;
  persist();
  const auth = await fetch(target + '/login', { method: 'POST', headers: { origin: 'https://www.trailerfeed.video', 'content-type': 'application/json' }, body: JSON.stringify({ username: 'gordo', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
  assert(auth.ok, 'Target owner session unavailable');
  const token = (await auth.json()).token;
  const removed = await fetch(target + `/runs/${state.oldTargetRunId}/delete`, { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ confirm_run_id: state.oldTargetRunId }) });
  assert(removed.ok, 'Disposable target removal failed');
  assert.equal((await fetch(target + `/data/comparisons/${state.oldTargetRunId}/run.json`)).status, 404, 'Old target remained visible');
  state.deleted = true; persist();
  console.log(JSON.stringify({ exactDisposableTargetRemoved: true, originalsRecorded: state.originals.length }));
} else if (mode === '--replace-create') {
  assert(state.deleted, 'Delete only the asserted disposable target first');
  const request = { action: 'connect', projectId: state.projectId, folderId: state.folderId, mode: 'create', targetTitle: 'Activity replacement QA 2026-10-07', replacesConnectionId: state.oldConnectionId, replacementId: state.replacementId, replacementConsent: true };
  const discarded = await owner(request);
  assert(discarded.ok, 'Explicit replacement failed before receipt-loss replay');
  await discarded.arrayBuffer();
  const replay = await owner(request);
  assert(replay.ok, 'Exact replacement receipt-loss replay failed');
  Object.assign(state, await replay.json()); persist();
  assert.notEqual(state.targetRunId, state.oldTargetRunId, 'Replacement recreated removed target');
  const current = await scope();
  assert(current.connections.find(item => item._id === state.oldConnectionId)?.replacedByConnectionId === state.connectionId, 'Old Review mapping history lost');
  assert.equal(current.items.filter(item => item.connectionId === state.connectionId).length, 0, 'Connection replacement published without fresh exact consent');
  console.log(JSON.stringify({ explicitReplacementReplayed: true, oldMappingRetained: true, automaticPublication: false, targetRunId: state.targetRunId }));
} else if (mode === '--publish-exact') {
  assert(state.connectionId, 'Replace the removed target first');
  const current = await scope();
  const versions = versionIds.map(id => current.versions.find(item => item.versionId === id));
  assert(versions.every(item => item?.ready), 'Synthetic exact versions not ready');
  const request = { action: 'confirm', connectionId: state.connectionId, confirmationId: state.confirmationId, versions: versions.map(item => ({ versionId: item.versionId, expectedMetadataUpdatedAt: item.expectedMetadataUpdatedAt })) };
  const confirmed = await owner(request); assert(confirmed.ok, 'Fresh exact-version publication failed');
  state.batchId = (await confirmed.json()).batchId; persist();
  for (let attempt = 0; attempt < 40; attempt++) {
    const rows = (await scope()).items.filter(item => item.batchId === state.batchId);
    if (rows.length === 2 && rows.every(item => item.state === 'synced')) break;
    assert(rows.every(item => !['failed', 'disconnected', 'source_deleted'].includes(item.state)), 'Fresh replacement delivery failed');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const rows = (await scope()).items.filter(item => item.batchId === state.batchId);
  assert(rows.length === 2 && rows.every(item => item.state === 'synced' && item.consentGeneration > 1), 'Fresh replacement did not finish');
  const artifacts = await catalog(state.targetRunId);
  const videos = artifacts.filter(item => item.artifact_type === 'video_result');
  const videoArtifactIds = new Set(videos.map(item => item.artifact_id));
  assert(videos.length === 2 && new Set(videos.map(item => item.source_version_id)).size === 2 && artifacts.every(item => item.ownership === 'external' && item.source_app === 'review-room' && (versionIds.includes(item.source_version_id) || videoArtifactIds.has(item.source_parent_artifact_id))), 'Replacement target duplicated or changed exact versions');
  const replay = await owner(request); assert(replay.ok && (await replay.json()).batchId === state.batchId, 'Fresh confirmation replay duplicated the batch');
  const source = await c.query('personal:snapshot', {});
  for (const original of state.originals) {
    const version = source.versions.find(item => item._id === original.versionId);
    assert(version?.assetId === original.assetId && version.originalKey === original.originalKey && JSON.stringify(version.creativeMetadata) === JSON.stringify(original.metadata) && version.metadataUpdatedAt === original.metadataUpdatedAt, 'Replacement changed Review originals or metadata');
  }
  state.complete = true; persist();
  const summary = { exactDisposableTargetRemoved: true, replacementReceiptReplay: true, oldMappingRetained: true, separateFreshConsent: true, uniqueNewTargetVideos: 2, totalArtifactsWithAttachedImages: artifacts.length, sourceOriginalsAndMetadataUnchanged: true, oldTargetRemains404: (await fetch(target + `/data/comparisons/${state.oldTargetRunId}/run.json`)).status === 404, targetRunId: state.targetRunId, generations: rows.map(item => item.consentGeneration), versionNumbers: videos.map(item => item.version_number) };
  assert(summary.oldTargetRemains404, 'Old target resurrected');
  writeFileSync('.scratch/release-readiness/v1s179-live-summary.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} else if (mode === '--replay-replacement') {
  assert(state.complete, 'Complete the original replacement acceptance first');
  const before = await catalog(state.targetRunId);
  const response = await owner({ action: 'connect', projectId: state.projectId, folderId: state.folderId, mode: 'create', targetTitle: 'Activity replacement QA 2026-10-07', replacesConnectionId: state.oldConnectionId, replacementId: state.replacementId, replacementConsent: true });
  assert(response.ok, 'Replacement replay after fresh publication failed');
  const result = await response.json();
  assert(result.connectionId === state.connectionId && result.targetRunId === state.targetRunId, 'Replacement replay changed current mapping');
  assert.deepEqual(await catalog(state.targetRunId), before, 'Replacement replay changed published exact versions');
  const rows = (await scope()).items.filter(item => item.connectionId === state.connectionId);
  assert(rows.length === 2 && rows.every(item => item.state === 'synced' && item.consentGeneration === 2), 'Replacement replay revoked or changed fresh delivery');
  const summaryPath = '.scratch/release-readiness/v1s179-live-summary.json';
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  Object.assign(summary, { authoritativeStatusReplay: true, publishedGenerationsUnchanged: true, stableReplacementIdentity: true });
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ authoritativeStatusReplay: true, publishedGenerationsUnchanged: true, stableReplacementIdentity: true }));
} else if (mode === '--stale-delivery') {
  assert(state.complete && state.oldArtifacts?.length, 'Verify the replacement publication first');
  const old = state.oldArtifacts.find(item => item.artifact_type === 'video_result');
  const original = state.originals.find(item => item.versionId === old.source_version_id);
  assert(original && Number.isSafeInteger(original.sourceCreatedAt), 'Original exact identity unavailable');
  const before = await catalog(state.targetRunId);
  const payload = { run_id: state.oldTargetRunId, batch_id: old.source_version_id === fixture.versionId ? fixture.confirmationId : recovery.confirmationId,
    source_asset_id: original.assetId, source_version_id: original.versionId, source_created_at: new Date(original.sourceCreatedAt).toISOString(), consent_generation: old.consent_generation,
    source_asset_code: old.source_asset_code ?? 'Synthetic QA', media_url: old.media_url, metadata: { model: '', prompt: '', sourceLabel: '' } };
  const stale = await fetch(target + '/external/review/versions', { method: 'POST', headers: { authorization: 'Bearer ' + process.env.TRAILER_FEED_REVIEW_INGEST_KEY, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  assert.equal(stale.status, 409, 'Old delivery was not fenced after replacement');
  const retired = await owner({ action: 'confirm', connectionId: state.oldConnectionId, confirmationId: randomUUID(), versions: [{ versionId: original.versionId, expectedMetadataUpdatedAt: original.metadataUpdatedAt ?? null }] });
  assert.equal(retired.status, 404, 'Retired Review connection still accepted publication');
  const after = await catalog(state.targetRunId);
  assert.deepEqual(after, before, 'Stale delivery changed the replacement catalog');
  const summaryPath = '.scratch/release-readiness/v1s179-live-summary.json';
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  Object.assign(summary, { oldDeliveryDenied: stale.status, retiredConnectionDenied: retired.status, replacementCatalogUnchangedAfterStaleDelivery: true });
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ oldDeliveryDenied: stale.status, retiredConnectionDenied: retired.status, replacementCatalogUnchanged: true }));
} else throw new Error('Choose --delete-disposable-target, --replace-create, --publish-exact, --replay-replacement or --stale-delivery after the combined deployment.');
