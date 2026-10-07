import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';
const path = '.scratch/release-readiness/activity-state.json.local';
const state = JSON.parse(readFileSync(path, 'utf8'));
const source = 'https://review.v1su4.dev', target = 'https://media.v1su4.dev/trailer-feed';
const c = new ConvexHttpClient('https://review-convex.v1su4.dev');
c.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const persist = () => writeFileSync(path, JSON.stringify(state, null, 2));
const catalog = async () => { const r = await fetch(`${target}/data/comparisons/${state.targetRunId}/artifacts.json`); assert(r.ok, 'QA catalog unavailable'); return r.json(); };
const run = await fetch(`${target}/data/comparisons/${state.targetRunId}/run.json`);
assert(run.ok && (await run.json()).title === 'Activity sync QA 2026-10-07', 'Refuse operation outside new synthetic target');
const before = await c.query('personal:snapshot', {});
const canonical = s => {
  const assets = s.assets.filter(a => a.projectId === 'ks70059gkp2ndsw6gy8a2sr5758fqfgk');
  const ids = new Set(assets.map(a => a._id));
  return createHash('sha256').update(JSON.stringify({ assets, versions: s.versions.filter(v => ids.has(v.assetId)), folders: s.folders.filter(f => f.projectId === 'ks70059gkp2ndsw6gy8a2sr5758fqfgk') })).digest('hex');
};
state.canonicalHash ??= canonical(before); persist();
const ownerAuth = await fetch(source + '/studio/sign-in?/email', { method: 'POST', redirect: 'manual', headers: { origin: source, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: 'gordo@v1su4.com', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
const cookie = ownerAuth.headers.get('set-cookie')?.split(';')[0]; assert(cookie, 'Review owner session unavailable');
async function owner(body) { const r = await fetch(source + '/api/owner-sync', { method: 'POST', headers: { cookie, origin: source, 'content-type': 'application/json' }, body: JSON.stringify(body) }); assert(r.ok, `Owner operation failed (${r.status})`); return r.json(); }
async function partner(route, body) { return fetch(target + '/external/review/' + route, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.TRAILER_FEED_REVIEW_INGEST_KEY }, body: JSON.stringify(body) }); }
const auth = await fetch(target + '/login', { method: 'POST', headers: { origin: 'https://www.trailerfeed.video', 'content-type': 'application/json' }, body: JSON.stringify({ username: 'gordo', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
assert(auth.ok, 'Target owner session unavailable'); const token = (await auth.json()).token;
const sync = () => c.query('destinationSync:snapshot', { projectId: state.projectId });
if (state.oldPayload && !state.oldPayload.source_created_at) {
  state.oldPayload.source_created_at = new Date(before.versions.find(v => v._id === state.selected.versionId).createdAt).toISOString(); persist();
}
if (process.argv.includes('--remove-version')) {
  const artifacts = await catalog(); assert(artifacts.length === 2 && artifacts.every(a => a.ownership === 'external'), 'Expected exactly two external QA videos');
  const item = artifacts.find(a => a.version_number === 1); assert(item, 'QA V1 missing');
  const delivery = (await sync()).items.find(j => j.versionId === item.source_version_id && j.state === 'synced'); assert(delivery, 'Synced source receipt missing');
  const batch = (await sync()).batches.find(b => b._id === delivery.batchId);
  state.selected = { artifactId: item.artifact_id, assetId: item.source_asset_id, versionId: item.source_version_id, generation: item.consent_generation, targetNumber: item.version_number, batchId: delivery.batchId };
  state.oldPayload = { source_asset_id: item.source_asset_id, source_version_id: item.source_version_id, source_created_at: new Date(before.versions.find(v => v._id === item.source_version_id).createdAt).toISOString(), consent_generation: item.consent_generation, run_id: state.targetRunId, batch_id: batch.confirmationId, source_asset_code: item.source_asset_code, media_url: item.media_url, metadata: { model: '', prompt: '', sourceLabel: '', referenceImageVersionIds: [] }, references: [] };
  persist();
  const r = await fetch(`${target}/versions/${item.artifact_id}/remove`, { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ run_id: state.targetRunId, confirm_artifact_id: item.artifact_id, expected_generation: item.consent_generation }) }); assert(r.ok, 'Version suppression failed');
  await c.action('destinationDelivery:reconcile', { projectId: state.projectId });
  const suppressed = (await sync()).items.find(j => j.id === delivery.id); assert(suppressed.state === 'disconnected' && suppressed.canSyncAgain, 'Source suppression not persisted');
  await owner({ action: 'retry', batchId: delivery.batchId });
  const replay = await partner('versions', state.oldPayload); assert(replay.status === 409, 'Delayed registration resurrected removed version');
  assert((await catalog()).length === 1, 'Generic retry restored target');
  assert(canonical(await c.query('personal:snapshot', {})) === state.canonicalHash, 'Canonical source changed');
  state.suppressed = true; persist();
  console.log(JSON.stringify({ versionSuppressed: true, sourceDisconnected: true, genericRetryCannotRestore: true, delayedRegister: replay.status, canonicalUnchanged: true }));
} else if (process.argv.includes('--verify-suppression')) {
  await c.action('destinationDelivery:reconcile', { projectId: state.projectId });
  const job = (await sync()).items.find(j => j.versionId === state.selected.versionId);
  assert(job.state === 'disconnected' && job.canSyncAgain, 'Suppression not persisted');
  await owner({ action: 'retry', batchId: state.selected.batchId });
  const replay = await partner('versions', state.oldPayload); assert(replay.status === 409, `Delayed registration result differs (${replay.status})`);
  assert((await catalog()).length === 1, 'Retry restored removed version');
  state.suppressed = true; persist();
  console.log(JSON.stringify({ versionSuppressed: true, sourceDisconnected: true, genericRetryCannotRestore: true, delayedRegister: replay.status }));
} else if (process.argv.includes('--reactivate')) {
  assert(state.suppressed && !state.reactivated, 'Explicit suppressed selection required');
  const r = await owner({ action: 'sync-again', connectionId: state.connectionId, confirmationId: randomUUID(), versionId: state.selected.versionId, expectedGeneration: state.selected.generation, expectedMetadataUpdatedAt: state.versions.find(v => v.versionId === state.selected.versionId).expectedMetadataUpdatedAt });
  state.reactivationBatchId = r.batchId; state.reactivated = true; persist();
  console.log(JSON.stringify({ queuedFreshConsent: true, batchId: r.batchId }));
} else if (process.argv.includes('--verify-reactivation')) {
  const artifacts = await catalog(); assert(artifacts.length === 2, 'Fresh consent did not restore exactly two videos');
  const item = artifacts.find(a => a.artifact_id === state.selected.artifactId); assert(item && item.version_number === state.selected.targetNumber && item.consent_generation > state.selected.generation, 'Reactivation identity or generation differs');
  const late = await partner('versions', state.oldPayload); assert(late.status === 409, 'Stale generation accepted after fresh consent');
  const old = await fetch(state.oldPayload.media_url, { headers: { 'if-none-match': '*' } }); assert(old.status === 404, 'Old grant remains readable');
  console.log(JSON.stringify({ restoredSameArtifact: true, targetNumber: item.version_number, freshGeneration: item.consent_generation, staleRegister: late.status, oldCapability: old.status }));
} else if (process.argv.includes('--remove-project')) {
  assert(state.reactivated, 'Complete reactivation before project test');
  const r = await fetch(`${target}/runs/${state.targetRunId}/delete`, { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ confirm_run_id: state.targetRunId }) }); assert(r.ok, 'Guarded synthetic project removal failed');
  await c.action('destinationDelivery:reconcile', { projectId: state.projectId });
  const jobs = (await sync()).items.filter(j => j.connectionId === state.connectionId); assert(jobs.length >= 2 && jobs.every(j => j.state === 'disconnected'), 'Deleted-project source rows not disconnected');
  for (const batchId of new Set(jobs.map(j => j.batchId))) await owner({ action: 'retry', batchId });
  const replay = await partner('versions', state.oldPayload); assert([404, 409].includes(replay.status), 'Delayed registration restored deleted project');
  assert((await fetch(`${target}/data/comparisons/${state.targetRunId}/run.json`)).status === 404, 'Deleted project recreated');
  const after = await c.query('personal:snapshot', {});
  assert(state.versions.every(v => after.versions.some(version => version._id === v.versionId)), 'Target removal destroyed Review originals');
  assert(canonical(after) === state.canonicalHash, 'Canonical source changed');
  state.cleaned = true; persist();
  console.log(JSON.stringify({ syntheticProjectRemoved: true, rowsDisconnected: jobs.length, genericRetryCannotRestore: true, delayedRegister: replay.status, reviewOriginalsRetained: true, canonicalUnchanged: true }));
} else throw new Error('Choose one explicit acceptance step');
