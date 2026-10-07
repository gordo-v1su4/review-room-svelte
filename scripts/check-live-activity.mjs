import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ConvexHttpClient } from 'convex/browser';
import { randomUUID } from 'node:crypto';
const origin = 'https://review.v1su4.dev';
const path = '.scratch/release-readiness/activity-state.json.local';
const projectId = 'ks7asamcyhnckexcnf29zh7ym58ft6nv';
const c = new ConvexHttpClient('https://review-convex.v1su4.dev');
c.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const auth = await fetch(origin + '/studio/sign-in?/email', { method: 'POST', redirect: 'manual', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: 'gordo@v1su4.com', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
const cookie = auth.headers.get('set-cookie')?.split(';')[0];
assert(cookie, 'Owner sign-in unavailable');
async function owner(url, body) {
  const response = await fetch(origin + url, { method: 'POST', redirect: 'manual', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert(response.ok, `Owner operation failed (${response.status})`);
  return response.json();
}
const snapshot = () => c.query('personal:snapshot', {});
let state = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
const persist = () => writeFileSync(path, JSON.stringify(state, null, 2));
if (process.argv.includes('--activity-sync')) {
  const evidencePath = '.scratch/release-readiness/activity-observation.json.local';
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  let s = await snapshot();
  const asset = s.assets.find(a => a._id === evidence.assetId && a.projectId === projectId);
  assert(asset?.assetCode === 'VID_20261007_00045' && asset.processingStatus === 'ready', 'Exact synthetic fixture must be ready');
  const title = 'Activity panel QA 2026-10-07';
  let folder = s.folders.find(f => f.projectId === projectId && f.title === title);
  if (!folder) {
    const form = new FormData(); form.set('projectId', projectId); form.set('title', title);
    const created = await fetch(origin + '/studio?/createFolder', { method: 'POST', redirect: 'manual', headers: { origin, cookie }, body: form });
    assert(created.ok || created.status === 303, 'Synthetic QA folder creation failed');
    s = await snapshot(); folder = s.folders.find(f => f.projectId === projectId && f.title === title);
  }
  assert(folder, 'Synthetic folder missing');
  if (asset.folderId !== folder._id) {
    const form = new FormData(); form.set('projectId', projectId); form.set('folderId', folder._id); form.append('assetIds', asset._id);
    const moved = await fetch(origin + '/studio?/moveAssets', { method: 'POST', redirect: 'manual', headers: { origin, cookie }, body: form });
    assert(moved.ok || moved.status === 303, 'Synthetic QA move failed');
  }
  evidence.folderId = folder._id;
  if (!evidence.connectionId) Object.assign(evidence, await owner('/api/owner-sync', { action: 'connect', projectId, folderId: folder._id, mode: 'create', targetTitle: title }));
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  const scopeResponse = await fetch(origin + `/api/owner-sync?projectId=${projectId}&folderId=${folder._id}`, { headers: { cookie } });
  assert(scopeResponse.ok, 'Synthetic QA scope unavailable');
  const scope = await scopeResponse.json();
  const version = scope.versions.find(row => row.versionId === evidence.versionId);
  assert(version && scope.versions.length === 1, 'Only the exact synthetic video may be published');
  evidence.confirmationId ??= randomUUID();
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  const confirmed = await owner('/api/owner-sync', { action: 'confirm', connectionId: evidence.connectionId, confirmationId: evidence.confirmationId, versions: [{ versionId: version.versionId, expectedMetadataUpdatedAt: version.expectedMetadataUpdatedAt }] });
  evidence.batchId = confirmed.batchId;
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ syntheticSyncQueued: true, label: asset.assetCode, batchId: evidence.batchId }));
} else if (process.argv.includes('--watch')) {
  const label = process.argv[process.argv.indexOf('--watch') + 1];
  assert(/^VID_\d{8}_\d+$/.test(label ?? ''), 'Provide the exact synthetic asset code');
  const s = await snapshot();
  const asset = s.assets.find(a => a.projectId === projectId && a.assetCode === label);
  assert(asset?.currentVersionId, 'Synthetic QA asset missing');
  const evidencePath = '.scratch/release-readiness/activity-observation.json.local';
  const observedIds = new Set();
  const stages = [];
  const startedAt = Date.now();
  let completed = false;
  while (Date.now() - startedAt < 180000) {
    const result = await owner('/api/owner-activity', { observedIds: [...observedIds] });
    const item = result.items.find(row => row.label === label && row.kind === 'ingest');
    if (item) {
      observedIds.add(item.id);
      if (stages.at(-1)?.stage !== item.stage || stages.at(-1)?.state !== item.state) {
        stages.push({ state: item.state, stage: item.stage, elapsedMs: Date.now() - startedAt });
        console.log(JSON.stringify(stages.at(-1)));
      }
      if (item.state === 'complete') { completed = true; break; }
      assert(item.state !== 'failed', 'Ingest failed; inspect retained actionable activity');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  writeFileSync(evidencePath, JSON.stringify({ projectId, assetId: asset._id, versionId: asset.currentVersionId, label, observedIds: [...observedIds], stages, completed }, null, 2));
  assert(completed, 'Ingest completion was not observed in the bounded window');
} else if (process.argv.includes('--prepare-sync')) {
  let s = await snapshot();
  assert(s.projects.find(p => p._id === projectId)?.title === 'Sync reliability QA 2026-10-06', 'Unexpected QA project');
  const assets = s.assets.filter(a => a.projectId === projectId && ['VID_20261007_00043', 'VID_20261007_00044'].includes(a.assetCode));
  assert(assets.length === 2 && assets.every(a => a.processingStatus === 'ready'), 'Exactly two new ready synthetic clips required');
  const title = 'Activity sync QA 2026-10-07';
  let folder = s.folders.find(f => f.projectId === projectId && f.title === title);
  if (!folder) {
    const form = new FormData(); form.set('projectId', projectId); form.set('title', title);
    const r = await fetch(origin + '/studio?/createFolder', { method: 'POST', redirect: 'manual', headers: { origin, cookie }, body: form });
    assert(r.ok || r.status === 303, 'Folder creation failed');
    s = await snapshot(); folder = s.folders.find(f => f.projectId === projectId && f.title === title);
  }
  assert(folder, 'QA folder missing');
  const form = new FormData(); form.set('projectId', projectId); form.set('folderId', folder._id);
  for (const asset of assets) form.append('assetIds', asset._id);
  const moved = await fetch(origin + '/studio?/moveAssets', { method: 'POST', redirect: 'manual', headers: { origin, cookie }, body: form });
  assert(moved.ok || moved.status === 303, 'QA move failed');
  if (!state.connectionId) {
    const result = await owner('/api/owner-sync', { action: 'connect', projectId, folderId: folder._id, mode: 'create', targetTitle: title });
    state = { ...state, projectId, folderId: folder._id, connectionId: result.connectionId, targetRunId: result.targetRunId };
    persist();
  }
  const scope = await (await fetch(origin + `/api/owner-sync?projectId=${projectId}&folderId=${folder._id}`, { headers: { cookie } })).json();
  assert(scope.versions.length === 2, 'QA publication scope differs');
  assert(scope.connections.find(item => item._id === state.connectionId), 'QA connection missing');
  state.versions = scope.versions.map(v => ({ versionId: v.versionId, expectedMetadataUpdatedAt: v.expectedMetadataUpdatedAt })); persist();
  console.log(JSON.stringify({ prepared: true, projectId, folderId: state.folderId, targetRunId: state.targetRunId, versions: state.versions.length }));
} else {
  const anonymous = await fetch(origin + '/api/owner-activity', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ observedIds: [] }) });
  assert(anonymous.status === 303, 'Anonymous activity must deny');
  const malformed = await fetch(origin + '/api/owner-activity', { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ observedIds: Array(101).fill('invalid') }) });
  assert(malformed.status === 400, 'Activity size bound must deny');
  const response = await fetch(origin + '/api/owner-activity', { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ observedIds: [] }) });
  assert(response.ok && response.headers.get('cache-control') === 'private, no-store', 'Owner-only uncached activity required');
  const result = await response.json();
  const serialized = JSON.stringify(result);
  assert(!/storageKey|payloadJson|posterKey|grantSlug|token|secret|https?:\/\//i.test(serialized), 'Activity exposed private task details');
  console.log(JSON.stringify({ anonymous: anonymous.status, malformed: malformed.status, owner: response.status, items: result.items.length, stages: result.items.map(item => ({ label: item.label, state: item.state, stage: item.stage })), privateDetails: false }));
}
