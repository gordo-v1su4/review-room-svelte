import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';

const origin = 'https://review.v1su4.dev';
const target = 'https://media.v1su4.dev/trailer-feed';
const fixture = JSON.parse(readFileSync('.scratch/release-readiness/activity-observation.json.local', 'utf8'));
const summaryPath = '.scratch/release-readiness/v1s167-replay-summary.json';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function signIn() {
  const response = await fetch(origin + '/studio/sign-in?/email', { method: 'POST', redirect: 'manual', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: 'gordo@v1su4.com', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert(cookie, 'Owner session unavailable');
  return cookie;
}
let cookie = await signIn();
async function owner(body) {
  return fetch(origin + '/api/owner-sync', { method: 'POST', redirect: 'manual', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
async function scope() {
  const response = await fetch(origin + `/api/owner-sync?projectId=${fixture.projectId}&folderId=${fixture.folderId}`, { headers: { cookie } });
  assert(response.ok, 'Owner persisted scope unavailable');
  return response.json();
}
async function catalog() {
  const response = await fetch(target + `/data/comparisons/${fixture.targetRunId}/artifacts.json`);
  assert(response.ok, 'Synthetic target catalog unavailable');
  return response.json();
}
const initial = await scope();
const source = initial.versions.find(item => item.versionId === fixture.versionId);
assert(source, 'Exact synthetic version required');
const rows = initial.items.filter(item => item.connectionId === fixture.connectionId);
const original = rows.find(row => row.versionId === fixture.versionId);
assert(original?.state === 'synced', 'Original activity sync must have completed');
const before = await catalog();
assert(before.filter(row => row.source_version_id === fixture.versionId).length === 1 && before.every(row => row.ownership === 'external'), 'Unexpected synthetic catalog');
const confirmation = { action: 'confirm', connectionId: fixture.connectionId, confirmationId: fixture.confirmationId, versions: [{ versionId: source.versionId, expectedMetadataUpdatedAt: source.expectedMetadataUpdatedAt }] };
const discarded = await owner(confirmation);
assert(discarded.ok, 'Confirmation replay failed before discarding receipt');
await discarded.arrayBuffer(); // Deliberate client receipt loss; do not use its contents.
cookie = await signIn(); // Independent owner session reopens persisted state.
const replays = await Promise.all(Array.from({ length: 6 }, () => owner(confirmation)));
assert(replays.every(response => response.ok), 'Concurrent exact confirmation replay failed');
const receipts = await Promise.all(replays.map(response => response.json()));
assert(receipts.every(receipt => receipt.batchId === fixture.batchId), 'Confirmation replay allocated a new source batch');
const changed = await owner({ ...confirmation, versions: [{ versionId: source.versionId, expectedMetadataUpdatedAt: source.expectedMetadataUpdatedAt === null ? 1 : source.expectedMetadataUpdatedAt + 1 }] });
assert.equal(changed.status, 409, 'Changed confirmation silently reused frozen consent');
const duplicate = await owner({ ...confirmation, confirmationId: randomUUID() });
assert.equal(duplicate.status, 409, 'New confirmation duplicated an already selected exact version');
const retry = await owner({ action: 'retry', batchId: fixture.batchId });
assert(retry.ok, 'Completed batch retry request failed');
const after = await catalog();
assert.equal(hash(after), hash(before), 'Receipt replay or completed retry changed the target catalog');
const refreshed = await scope();
const persisted = refreshed.items.filter(item => item.connectionId === fixture.connectionId);
assert.equal(persisted.length, rows.length, 'Receipt replay duplicated the source outbox');
const originalAfter = persisted.find(row => row.versionId === fixture.versionId);
assert.equal(originalAfter?.state, 'synced', 'Persisted source state changed after replay');
assert.equal(originalAfter.targetArtifactId, original.targetArtifactId, 'Receipt replay changed target identity');
assert.equal(originalAfter.targetVersionNumber, original.targetVersionNumber, 'Receipt replay changed target ordering');
const summary = { observedAt: new Date().toISOString(), exactSyntheticVersion: fixture.versionId, targetRunId: fixture.targetRunId, batchId: fixture.batchId, discardedClientReceipt: true, independentOwnerSession: true, concurrentReplays: 6, changedConfirmation: changed.status, duplicateNewConfirmation: duplicate.status, uniqueSourceJobsForExactVersion: 1, uniqueTargetArtifactsForExactVersion: 1, totalSourceJobs: persisted.length, totalTargetArtifacts: after.length, targetIdentityAndCatalogUnchanged: true, sourceState: originalAfter.state };
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
