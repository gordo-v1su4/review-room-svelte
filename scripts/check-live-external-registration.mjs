import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';

const review = 'https://review.v1su4.dev';
const target = 'https://media.v1su4.dev/trailer-feed';
const statePath = '.scratch/release-readiness/registration-state.json.local';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const client = new ConvexHttpClient('https://review-convex.v1su4.dev');
client.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
const persist = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
let cookie;
async function owner(path, body, method = 'POST') {
  const response = await fetch(review + path, { method, redirect: 'manual', headers: { origin: review, cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert(response.ok, 'Owner operation failed: ' + path + ' (' + response.status + ')');
  return response.json();
}
async function partner(path, body) {
  return fetch(target + '/external/review/' + path, { method: 'POST', headers: {
    authorization: 'Bearer ' + process.env.TRAILER_FEED_REVIEW_INGEST_KEY, 'content-type': 'application/json',
  }, body: JSON.stringify(body) });
}
async function upload(name, stem, mimeType, durationSec) {
  const bytes = readFileSync('.scratch/review-trailer-sync/live-qa/' + stem);
  const poster = readFileSync('.scratch/review-trailer-sync/live-qa/poster.jpg');
  const existing = (await client.query('personal:snapshot', {})).assets.filter(item => item.projectId === state.projectId && item.originalFilename === name);
  assert(existing.length <= 1, 'Duplicate named QA source fixture');
  let result = existing.length ? { assetId: existing[0]._id } : null;
  if (!result) {
    const ticket = await owner('/api/uploads/begin', { projectId: state.projectId, name, type: mimeType, size: bytes.length });
    for (const [url, body, type] of [[ticket.url, bytes, mimeType], [ticket.posterUrl, poster, 'image/jpeg']]) {
      const response = await fetch(url, { method: 'PUT', headers: { 'content-type': type }, body });
      assert(response.ok, 'Synthetic storage PUT failed');
    }
    result = await owner('/api/uploads/complete', { sessionId: ticket.sessionId, posterSizeBytes: poster.length, durationSec, width: 320, height: 180 });
  }
  for (let attempt = 0; attempt < 120; attempt++) {
    const snapshot = await client.query('personal:snapshot', {});
    const asset = snapshot.assets.find(item => item._id === result.assetId);
    const version = snapshot.versions.find(item => item._id === asset?.currentVersionId);
    if (version?.processingState === 'ready') return { assetId: asset._id, versionId: version._id, code: asset.assetCode, created: new Date(version.createdAt).toISOString(), sourceFile: stem };
    assert(version?.processingState !== 'failed', 'Synthetic worker failed');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Synthetic processing readiness timed out');
}
const catalog = async runId => {
  const response = await fetch(target + '/data/comparisons/' + runId + '/artifacts.json');
  assert(response.ok, 'Target catalog read failed');
  return response.json();
};
try {
  const auth = await fetch(review + '/studio/sign-in?/email', { method: 'POST', redirect: 'manual',
    headers: { origin: review, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'gordo@v1su4.com', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
  cookie = auth.headers.get('set-cookie')?.split(';')[0];
  assert(cookie, 'Owner session unavailable');
  if (process.argv.includes('--cleanup')) {
    const runResponse = await fetch(target + '/data/comparisons/' + state.runId + '/run.json');
    if (runResponse.ok) {
      const run = await runResponse.json();
      assert.equal(run.title, 'Sync reliability QA 2026-10-06', 'Refusing to remove a non-QA project');
      const artifacts = await catalog(state.runId);
      assert(artifacts.length === 3 && artifacts.every(item => item.ownership === 'external' && item.source_app === 'review-room'), 'QA catalog ownership changed; stop cleanup');
      const auth = await fetch(target + '/login', { method: 'POST', headers: { origin: 'https://www.trailerfeed.video', 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'gordo', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
      assert(auth.ok, 'Target cleanup owner session unavailable');
      const token = (await auth.json()).token;
      const removed = await fetch(target + '/runs/' + state.runId + '/delete', { method: 'POST',
        headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ confirm_run_id: state.runId }) });
      assert(removed.ok, 'Synthetic target cleanup failed');
    } else assert.equal(runResponse.status, 404, 'Unexpected QA project read failure');
    for (const grant of state.grants ?? []) await owner('/api/owner-publication-grants', { grantId: grant.grantId, expectedGeneration: grant.consentGeneration }, 'DELETE');
    assert.equal((await fetch(target + '/data/comparisons/' + state.runId + '/run.json')).status, 404, 'QA target remained listed');
    const source = await client.query('personal:snapshot', {});
    assert([state.first, state.second, state.image].every(item => source.assets.some(asset => asset._id === item.assetId && asset.projectId === state.projectId)), 'Target cleanup removed Review sources');
    state.revoked = true; state.cleaned = true; persist();
    console.log(JSON.stringify({ syntheticTargetRemoved: true, qaCapabilitiesRevoked: true, allThreeSourceAssetsRetained: true }));
  } else if (process.argv.includes('--revoke')) {
    for (const grant of state.grants ?? []) await owner('/api/owner-publication-grants', { grantId: grant.grantId, expectedGeneration: grant.consentGeneration }, 'DELETE');
    state.revoked = true; persist();
    console.log(JSON.stringify({ qaCapabilitiesRevoked: true, targetRunId: state.runId }));
  } else {
    assert(!state.revoked, 'This QA selection is revoked; do not silently republish it');
    if (!state.projectId) {
      const response = await fetch(review + '/api/v1/projects', { method: 'POST', headers: {
        authorization: 'Bearer ' + process.env.REVIEW_ROOM_AGENT_API_KEY, 'content-type': 'application/json', 'idempotency-key': 'v1s166-sync-reliability-20261006',
      }, body: JSON.stringify({ title: 'Sync reliability QA 2026-10-06', description: 'Synthetic registration/retry acceptance only. Never use canonical media or recreate the removed old QA target.' }) });
      assert(response.ok, 'QA project creation failed');
      state.projectId = (await response.json()).projectId; persist();
    }
    if (!state.first) { state.first = await upload('registration-first.mp4', 'synthetic-v1.mp4', 'video/mp4', 2); persist(); }
    if (!state.second) { state.second = await upload('registration-second.mp4', 'synthetic-v2.mp4', 'video/mp4', 2); persist(); }
    if (!state.image) { state.image = await upload('registration-grid.jpg', 'poster.jpg', 'image/jpeg', 0); persist(); }
    if (!state.runId) {
      const response = await partner('connections', { source_project_id: state.projectId, mode: 'create', title: 'Sync reliability QA 2026-10-06' });
      assert(response.ok, 'Explicit QA target connection failed');
      state.runId = (await response.json()).run_id; persist();
    }
    state.batchId ??= 'v1s166-registration-' + state.projectId;
    state.grants ??= [];
    for (const [index, item] of [state.first, state.second].entries()) {
      if (!state.grants[index]) {
        state.grants[index] = await owner('/api/owner-publication-grants', { destinationKey: 'trailer-feed', versionId: item.versionId,
          referenceVersionIds: index === 0 ? [state.image.versionId] : [], allowedOrigins: ['https://www.trailerfeed.video'] });
        persist();
      }
    }
    const identity = item => ({ source_asset_id: item.assetId, source_version_id: item.versionId, source_created_at: item.created, consent_generation: 1 });
    const versions = [state.first, state.second].map(identity);
    const reservation = await partner('batches', { run_id: state.runId, batch_id: state.batchId, versions: [...versions].reverse() });
    assert(reservation.ok, 'Ordered QA reservation failed');
    const allocated = (await reservation.json()).versions;
    assert.deepEqual(allocated.map(item => [item.source_version_id, item.version_number]), [[state.first.versionId, 1], [state.second.versionId, 2]], 'Reservation order drifted');
    const payload = (item, index) => {
      const grant = state.grants[index];
      const root = review + '/api/destination-media/' + grant.slug + '/' + item.versionId;
      return { run_id: state.runId, batch_id: state.batchId, ...identity(item), source_asset_code: item.code,
        media_url: root + '/original', poster_url: root + '/poster', metadata: { model: 'Synthetic registration acceptance', prompt: 'Two seconds, silent color bars', sourceLabel: 'QA take ' + (index + 1), notes: 'Disposable QA only', customFields: [{ id: 'seed', label: 'Seed', kind: 'number', value: 0 }] },
        ...(index === 0 ? { grid: { source_version_id: state.image.versionId, media_url: review + '/api/destination-media/' + grant.slug + '/' + state.image.versionId + '/original' } } : {}) };
    };
    const bad = await partner('versions', { ...payload(state.first, 0), metadata: { model: 42 } });
    assert.equal(bad.status, 400, 'Invalid metadata must not consume registration');
    const second = await partner('versions', payload(state.second, 1));
    assert(second.ok, 'Newer item registration failed');
    await second.arrayBuffer(); // Deliberately discard the receipt, then replay the exact request.
    const replay = await partner('versions', payload(state.second, 1));
    assert.equal(replay.status, 200, 'Lost-receipt replay was not idempotent');
    assert.equal((await replay.json()).artifact.version_number, 2, 'Newer item stole the older reservation');
    const concurrent = await Promise.all(Array.from({ length: 8 }, () => partner('versions', payload(state.first, 0))));
    assert(concurrent.every(response => response.ok), 'Concurrent same-version delivery failed');
    const receipts = await Promise.all(concurrent.map(response => response.json()));
    assert.equal(new Set(receipts.map(item => item.artifact.artifact_id)).size, 1, 'Concurrent delivery created duplicate identities');
    const reordered = await partner('batches', { run_id: state.runId, batch_id: state.batchId, versions });
    assert.equal(reordered.status, 200, 'Equivalent reordered reservation did not replay');
    const changed = await partner('batches', { run_id: state.runId, batch_id: state.batchId, versions: versions.slice(0, 1) });
    assert.equal(changed.status, 409, 'Changed consent reused the old batch');
    const artifacts = await catalog(state.runId);
    const videos = artifacts.filter(item => item.artifact_type === 'video_result');
    assert.equal(videos.length, 2, 'Target video count differs');
    assert.equal(artifacts.length, 3, 'Concurrent registration duplicated the grid');
    for (const item of [state.first, state.second]) {
      const artifact = videos.find(value => value.source_version_id === item.versionId);
      assert.equal(artifact.ownership, 'external');
      assert.equal(artifact.creative_metadata.customFields[0].value, 0, 'Empty numeric creative field changed');
      assert(!artifact.object_key && !artifact.storage_key && !artifact.local_path, 'Target copied/claimed source blob');
      const response = await fetch(artifact.media_url, { headers: { origin: 'https://www.trailerfeed.video', range: 'bytes=0-1023' } });
      assert.equal(response.status, 206, 'Registered exact source range failed');
      const expected = readFileSync('.scratch/review-trailer-sync/live-qa/' + item.sourceFile);
      assert.equal(digest(Buffer.from(await response.arrayBuffer())), digest(expected.subarray(0, 1024)), 'Registered media bytes differ');
    }
    const targetAuth = await fetch(target + '/login', { method: 'POST', headers: { origin: 'https://www.trailerfeed.video', 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'gordo', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
    assert(targetAuth.ok, 'Target owner session unavailable');
    const targetToken = (await targetAuth.json()).token;
    const firstArtifact = videos.find(item => item.source_version_id === state.first.versionId);
    const edit = await fetch(target + '/versions/' + firstArtifact.artifact_id + '/details', { method: 'POST',
      headers: { authorization: 'Bearer ' + targetToken, 'content-type': 'application/json' },
      body: JSON.stringify({ run_id: state.runId, revision: firstArtifact.context_revision ?? 0, prompt: 'Target QA edit retained across replay', video_model: 'Target QA model' }) });
    assert(edit.ok, 'Target QA edit failed');
    const afterEditReplay = await partner('versions', payload(state.first, 0));
    assert.equal(afterEditReplay.status, 200, 'Edited target registration replay failed');
    const kept = (await afterEditReplay.json()).artifact;
    assert.equal(kept.version_prompt, 'Target QA edit retained across replay', 'Registration overwrote target prompt edit');
    assert.equal(kept.video_model, 'Target QA model', 'Registration overwrote target model edit');
    assert.equal(kept.shot_grid_artifact_id, firstArtifact.shot_grid_artifact_id, 'Registration replaced target grid');
    const serialized = JSON.stringify(artifacts);
    assert(!serialized.includes(process.env.TRAILER_FEED_REVIEW_INGEST_KEY), 'Partner credential leaked in public catalog');
    const summary = { sourceProjectId: state.projectId, targetRunId: state.runId, sourceVersions: versions.map(item => item.source_version_id),
      concurrentDeliveries: 8, uniqueOlderArtifact: 1, targetVideoCount: 2, targetImageCount: 1,
      discardedReceiptReplay: 200, reorderedReservation: 200, changedConsent: 409, invalidMetadata: 400,
      stableVersionNumbers: [1, 2], exactRangeBytes: true, externalOwnershipOnly: true, noPartnerSecretInCatalog: true, targetEditsAndGridPreservedOnReplay: true };
    writeFileSync('.scratch/release-readiness/v1s166-live-summary.json', JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
  }
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : 'Live external registration failed'); process.exitCode = 1;
}
