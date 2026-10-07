import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';

const origin = 'https://review.v1su4.dev';
const target = 'https://media.v1su4.dev/trailer-feed';
const fixture = JSON.parse(readFileSync('.scratch/release-readiness/activity-observation.json.local', 'utf8'));
const statePath = '.scratch/release-readiness/source-outbox-recovery.json.local';
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { projectId: fixture.projectId, folderId: fixture.folderId, connectionId: fixture.connectionId, targetRunId: fixture.targetRunId };
const persist = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
assert(state.projectId === fixture.projectId && state.targetRunId === fixture.targetRunId, 'Synthetic fixture identity changed');
const c = new ConvexHttpClient('https://review-convex.v1su4.dev');
c.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const login = await fetch(origin + '/studio/sign-in?/email', { method: 'POST', redirect: 'manual', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: 'gordo@v1su4.com', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
const cookie = login.headers.get('set-cookie')?.split(';')[0];
assert(cookie, 'Owner session unavailable');
async function owner(path, body) {
  const response = await fetch(origin + path, { method: 'POST', redirect: 'manual', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert(response.ok, `Owner operation failed (${response.status})`);
  return response.json();
}
const snapshot = () => c.query('destinationSync:snapshot', { projectId: state.projectId });
const ownItems = data => data.items.filter(row => row.connectionId === state.connectionId);
async function catalog() {
  const response = await fetch(target + `/data/comparisons/${state.targetRunId}/artifacts.json`);
  assert(response.ok, 'Synthetic target unavailable');
  return response.json();
}
const mode = process.argv[2];
if (mode === '--prepare') {
  let source = await c.query('personal:snapshot', {});
  assert(source.projects.find(p => p._id === state.projectId)?.title === 'Sync reliability QA 2026-10-06', 'Wrong QA project');
  const name = 'source-outbox-recovery-20261007.mp4';
  let matches = source.assets.filter(a => a.projectId === state.projectId && a.originalFilename === name);
  assert(matches.length <= 1, 'Duplicate synthetic upload fixture');
  if (!matches.length) {
    const bytes = readFileSync('.scratch/review-trailer-sync/live-qa/synthetic-v2.mp4');
    const poster = readFileSync('.scratch/review-trailer-sync/live-qa/poster.jpg');
    const ticket = await owner('/api/uploads/begin', { projectId: state.projectId, folderId: state.folderId, name, type: 'video/mp4', size: bytes.length });
    for (const [url, body, type] of [[ticket.url, bytes, 'video/mp4'], [ticket.posterUrl, poster, 'image/jpeg']]) assert((await fetch(url, { method: 'PUT', headers: { 'content-type': type }, body })).ok, 'Synthetic upload PUT failed');
    const completed = await owner('/api/uploads/complete', { sessionId: ticket.sessionId, posterSizeBytes: poster.length, durationSec: 2, width: 320, height: 180 });
    state.assetId = completed.assetId; persist();
  } else state.assetId = matches[0]._id;
  for (let attempt = 0; attempt < 180; attempt++) {
    source = await c.query('personal:snapshot', {});
    const asset = source.assets.find(a => a._id === state.assetId);
    assert(asset?.folderId === state.folderId, 'Synthetic upload folder changed');
    if (asset.processingStatus === 'ready') { state.versionId = asset.currentVersionId; state.assetCode = asset.assetCode; break; }
    assert(asset.processingStatus !== 'error', 'Synthetic processing failed');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(state.versionId, 'Synthetic upload did not become ready');
  const items = ownItems(await snapshot());
  assert(items.length === 1 && items[0].versionId === fixture.versionId && items[0].state === 'synced', 'Upload published automatically or first success changed');
  state.firstSuccess = items[0]; state.confirmationId ??= randomUUID(); persist();
  console.log(JSON.stringify({ prepared: true, syntheticAsset: state.assetCode, firstSuccessRetained: true, newUploadPrivate: true }));
} else if (mode === '--enqueue-offline') {
  assert(state.versionId && state.firstSuccess, 'Prepare the exact synthetic fixture first');
  const source = await c.query('personal:snapshot', {});
  const version = source.versions.find(v => v._id === state.versionId);
  assert(version?.assetId === state.assetId && version.processingState === 'ready', 'Synthetic exact version unavailable');
  const result = await owner('/api/owner-sync', { action: 'confirm', connectionId: state.connectionId, confirmationId: state.confirmationId, versions: [{ versionId: state.versionId, expectedMetadataUpdatedAt: version.metadataUpdatedAt ?? null }] });
  state.batchId = result.batchId; persist();
  console.log(JSON.stringify({ queuedWhileOffline: true, batchId: state.batchId }));
} else if (mode === '--failed') {
  assert(state.batchId, 'Offline confirmation missing');
  let items;
  for (let attempt = 0; attempt < 12; attempt++) {
    items = ownItems(await snapshot());
    if (items.find(item => item.batchId === state.batchId)?.state === 'failed') break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const failed = items.find(item => item.batchId === state.batchId);
  assert(failed?.state === 'failed', 'Real outage did not persist a failed source operation');
  const first = items.find(item => item.versionId === fixture.versionId);
  assert(first?.state === 'synced' && first.attempts === state.firstSuccess.attempts && first.targetArtifactId === state.firstSuccess.targetArtifactId, 'Outage changed the successful source entry');
  state.failedObserved = { jobId: failed.id, attempts: failed.attempts, lastError: failed.lastError }; persist();
  console.log(JSON.stringify({ realFailurePersisted: true, firstSuccessRetained: true, error: failed.lastError }));
} else if (mode === '--retry') {
  assert(state.failedObserved, 'Capture a real persisted failure before retry');
  await owner('/api/owner-sync', { action: 'retry', batchId: state.batchId });
  let items;
  for (let attempt = 0; attempt < 40; attempt++) {
    items = ownItems(await snapshot());
    if (items.find(item => item.batchId === state.batchId)?.state === 'synced') break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const first = items.find(item => item.versionId === fixture.versionId);
  const recovered = items.find(item => item.batchId === state.batchId);
  assert(recovered?.state === 'synced', 'Real failed source operation did not recover');
  assert(first?.state === 'synced' && first.attempts === state.firstSuccess.attempts && first.targetArtifactId === state.firstSuccess.targetArtifactId, 'Retry resent or changed the earlier success');
  const artifacts = await catalog();
  assert(artifacts.length === 2 && new Set(artifacts.map(a => a.source_version_id)).size === 2, 'Recovery duplicated target versions');
  assert(artifacts.every(a => a.ownership === 'external' && [fixture.versionId, state.versionId].includes(a.source_version_id)), 'Unexpected target ownership or source');
  assert.equal(artifacts.find(a => a.source_version_id === fixture.versionId).artifact_id, state.firstSuccess.targetArtifactId, 'Earlier target artifact changed');
  const summary = { realOutageFailure: true, reloadViaIndependentInvocation: true, earlierSuccessRetained: true, earlierSuccessNotRetried: true, recoveredState: recovered.state, uniqueSourceJobs: items.length, uniqueTargetVersions: artifacts.length, versionNumbers: artifacts.map(a => a.version_number), separateBatchRecovery: true };
  state.recovered = true; persist();
  writeFileSync('.scratch/release-readiness/v1s167-recovery-summary.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} else throw new Error('Choose --prepare, --enqueue-offline, --failed or --retry. This harness never stops services.');
