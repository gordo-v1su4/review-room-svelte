import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';

// Deliberately live, explicit QA acceptance. Never print credentials/capability URLs.
const base = 'https://review.v1su4.dev';
const statePath = '.scratch/release-readiness/version-reference-state.json.local';
const evidencePath = '.scratch/release-readiness/v1s164-live-summary.json';
const admin = new ConvexHttpClient('https://review-convex.v1su4.dev');
admin.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const credentials = [];
let cookie;
async function ownerSession() {
  const response = await fetch(base + '/studio/sign-in?/email', {
    method: 'POST', redirect: 'manual', headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'gordo@v1su4.com', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }),
  });
  cookie = response.headers.get('set-cookie')?.split(';')[0];
  const result = response.status === 200 ? await response.json() : null;
  assert(cookie && (response.status === 303 || result?.type === 'redirect'), 'Owner session unavailable');
}
async function ownerRequest(path, body) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', redirect: 'manual',
    headers: { origin: base, cookie, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  return response;
}
async function post(path, body) {
  const response = await ownerRequest(path, body);
  assert(response.ok, `${path} failed (${response.status})`);
  return response.json();
}
async function metadata(versionId) {
  const response = await ownerRequest('/api/owner-version-metadata?versionId=' + versionId);
  assert(response.ok, 'Owner exact-version read failed');
  return response.json();
}
async function save(versionId, value) {
  const current = await metadata(versionId);
  return post('/api/owner-version-metadata', { versionId, metadata: value, expectedUpdatedAt: current.metadataUpdatedAt ?? null });
}
async function uploadImage(projectId, name, bytes, assetId) {
  const ticket = await post('/api/uploads/begin', { projectId, name, type: 'image/jpeg', size: bytes.length, ...(assetId ? { assetId } : {}) });
  for (const url of [ticket.url, ticket.posterUrl]) {
    if (!url) continue;
    const response = await fetch(url, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: bytes });
    assert(response.ok, 'QA image storage transfer failed');
  }
  const result = await post('/api/uploads/complete', { sessionId: ticket.sessionId, posterSizeBytes: bytes.length, durationSec: 0, width: 320, height: 180 });
  for (let attempt = 0; attempt < 30; attempt++) {
    const snapshot = await admin.query('personal:snapshot', {});
    const asset = snapshot.assets.find(item => item._id === result.assetId);
    const version = snapshot.versions.find(item => item._id === asset?.currentVersionId);
    if (version?.processingState === 'ready') return { assetId: asset._id, versionId: version._id, version: version.version };
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('QA image readiness timed out');
}
async function ephemeralCredential(projectId, actions) {
  // Short-lived acceptance-only capability; plaintext remains process-local and is always revoked.
  const key = 'rr_v1_' + randomBytes(32).toString('base64url');
  const id = await admin.mutation('automation:issue', { name: 'V1S-164 scoped acceptance', keyDigest: digest(key),
    projectId, actions, expiresAt: Date.now() + 5 * 60_000 });
  credentials.push(id);
  return { id, key };
}
async function scoped(versionId, key) {
  return fetch(base + '/api/v1/versions/' + versionId + '/metadata', {
    headers: key ? { authorization: 'Bearer ' + key } : {}, redirect: 'manual',
  });
}
function archiveDigest(rows) {
  return digest(rows.map(row => [row._id, row.sourceDocumentsJson, row.mediaMappingsJson]).sort());
}
function canonicalDigest(snapshot, id) {
  return digest({ assets: snapshot.assets.filter(item => item.projectId === id),
    versions: snapshot.versions.filter(item => snapshot.assets.some(asset => asset.projectId === id && asset._id === item.assetId)) });
}

try {
  mkdirSync('.scratch/release-readiness', { recursive: true });
  await ownerSession();
  if (process.argv.includes('--restore')) {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    await save(state.videoVersionId, state.originalMetadata);
    const current = await metadata(state.videoVersionId);
    assert.deepEqual(current.metadata, state.originalMetadata, 'Original QA metadata was not restored');
    const snapshot = await admin.query('personal:snapshot', {});
    assert.equal(canonicalDigest(snapshot, state.canonicalProjectId), state.canonicalDigest, 'Canonical project changed');
    assert.equal(archiveDigest(await admin.query('sourceImports:list', {})), state.archiveDigest, 'Import archive changed');
    state.restored = true;
    writeFileSync(statePath, JSON.stringify(state, null, 2));
    console.log(JSON.stringify({ restored: true, retainedPrivateQAFixture: !!state.image?.assetId, canonicalUnchanged: true, archiveUnchanged: true }));
  } else if (process.argv.includes('--observe')) {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    const current = await metadata(state.videoVersionId);
    assert.equal(current.metadata.gridImageVersionId, state.image.versionId, 'Independent session lost grid pin');
    assert.deepEqual(current.metadata.referenceImageVersionIds, [state.image.versionId], 'Independent session lost reference pin');
    const image = await ownerRequest('/api/owner-media/' + state.image.assetId + '?versionId=' + state.image.versionId);
    assert.equal(image.status, 200, 'Independent session could not read exact image');
    assert.equal(digest(Buffer.from(await image.arrayBuffer())), digest(readFileSync('.scratch/review-trailer-sync/live-qa/poster.jpg')), 'Independent image bytes floated');
    console.log(JSON.stringify({ independentSessionPinnedReferences: true, exactBytes: true }));
  } else {
    if (existsSync(statePath)) {
      const prior = JSON.parse(readFileSync(statePath, 'utf8'));
      assert(prior.restored, 'Restore previous QA metadata before creating another acceptance fixture');
    }
    const before = await admin.query('personal:snapshot', {});
    const qa = before.projects.find(item => item.title === 'Sync QA 2026-10-06' && item.description?.startsWith('Agent-created synthetic'));
    const canonical = before.projects.find(item => item.title === 'Trailer Feed');
    assert(qa && canonical, 'Named QA/canonical scope unavailable');
    const qaVideos = before.assets.filter(item => item.projectId === qa._id && item.mimeType.startsWith('video/'));
    assert.equal(qaVideos.length, 1, 'Expected exactly one existing QA video');
    const video = qaVideos[0];
    const foreign = before.assets.find(item => item.projectId === canonical._id && item.mimeType.startsWith('image/'));
    assert(video?.currentVersionId && foreign?.currentVersionId, 'Expected video/image identity unavailable');
    const original = await metadata(video.currentVersionId);
    const state = { qaProjectId: qa._id, videoVersionId: video.currentVersionId, originalMetadata: original.metadata,
      canonicalProjectId: canonical._id, canonicalDigest: canonicalDigest(before, canonical._id),
      archiveDigest: archiveDigest(await admin.query('sourceImports:list', {})) };
    writeFileSync(statePath, JSON.stringify(state, null, 2));
    const bytes = readFileSync('.scratch/review-trailer-sync/live-qa/poster.jpg');
    const image = await uploadImage(qa._id, 'v1s164-reference-v1.jpg', bytes);
    state.image = image;
    writeFileSync(statePath, JSON.stringify(state, null, 2));
    const attached = { ...original.metadata, gridImageVersionId: image.versionId, referenceImageVersionIds: [image.versionId] };
    await save(video.currentVersionId, attached);
    const attachedRead = await metadata(video.currentVersionId);
    assert.deepEqual(attachedRead.metadata, attached, 'Exact-version reference did not persist');
    const denied = await ownerRequest('/api/owner-version-metadata', { versionId: video.currentVersionId,
      expectedUpdatedAt: attachedRead.metadataUpdatedAt, metadata: { ...attached, referenceImageVersionIds: [foreign.currentVersionId] } });
    assert.equal(denied.status, 400, 'Cross-project reference must be rejected');
    assert.deepEqual((await metadata(video.currentVersionId)).metadata, attached, 'Denied save changed metadata');
    const anonymous = await fetch(base + '/api/owner-version-metadata?versionId=' + video.currentVersionId, { redirect: 'manual' });
    assert([302, 303].includes(anonymous.status), 'Anonymous owner read must redirect before data access');
    await post('/api/owner-review', { assetId: image.assetId, status: 'approved' });
    const replacement = await uploadImage(qa._id, 'v1s164-reference-v2.jpg', readFileSync('.scratch/review-trailer-sync/live-qa/poster-v2.jpg'), image.assetId);
    assert.notEqual(replacement.versionId, image.versionId, 'Image replacement did not create another exact version');
    const pinned = await ownerRequest('/api/owner-media/' + image.assetId + '?versionId=' + image.versionId);
    assert.equal(pinned.status, 200, 'Historical exact image is unavailable');
    assert.equal(digest(Buffer.from(await pinned.arrayBuffer())), digest(bytes), 'Reference floated to replacement image bytes');
    const wrongPair = await ownerRequest('/api/owner-media/' + image.assetId + '?versionId=' + foreign.currentVersionId);
    assert.equal(wrongPair.status, 404, 'Wrong asset/version pair must fail');
    const reader = await ephemeralCredential(qa._id, ['media:read']);
    const allowed = await scoped(video.currentVersionId, reader.key);
    assert.equal(allowed.status, 200, 'Scoped authorized metadata failed');
    const publicBody = await allowed.json();
    assert.deepEqual(publicBody.metadata, attached, 'Scoped metadata identity/value mismatch');
    const serialized = JSON.stringify(publicBody);
    assert(!/originalKey|storageKey|posterKey|spriteKey|https?:\/\//.test(serialized), 'Scoped metadata leaked storage or delivery identity');
    assert.equal((await scoped(foreign.currentVersionId, reader.key)).status, 403, 'Project-scoped reader crossed projects');
    const uploader = await ephemeralCredential(qa._id, ['media:upload']);
    assert.equal((await scoped(video.currentVersionId, uploader.key)).status, 403, 'Upload-only credential read metadata');
    await admin.mutation('automation:revoke', { credentialId: reader.id });
    assert.equal((await scoped(video.currentVersionId, reader.key)).status, 401, 'Revoked metadata credential remained valid');
    assert.equal((await scoped(video.currentVersionId)).status, 401, 'Anonymous agent metadata was exposed');
    assert.equal((await scoped(video.currentVersionId, 'invalid-acceptance-key')).status, 401, 'Invalid agent credential remained valid');
    const after = await admin.query('personal:snapshot', {});
    assert.equal(canonicalDigest(after, canonical._id), state.canonicalDigest, 'Canonical project was altered');
    assert.equal(archiveDigest(await admin.query('sourceImports:list', {})), state.archiveDigest, 'Private import archive changed');
    const summary = { releaseVersion: await (await fetch(base + '/_app/version.json')).json(),
      qaProjectId: qa._id, videoVersionId: video.currentVersionId, imageAssetId: image.assetId,
      pinnedImageVersionId: image.versionId, currentImageVersionId: replacement.versionId,
      persistedReferences: true, crossProjectSave: denied.status, anonymousOwnerRead: anonymous.status,
      wrongAssetVersion: wrongPair.status, exactOriginalBytes: true, scopedRead: 200,
      foreignProjectRead: 403, uploadOnlyRead: 403, revokedRead: 401, anonymousAgentRead: 401,
      canonicalUnchanged: true, archiveUnchanged: true, temporaryCredentialsRevoked: true };
    writeFileSync(evidencePath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
  }
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : 'Live acceptance failed');
  process.exitCode = 1;
} finally {
  for (const credentialId of credentials) await admin.mutation('automation:revoke', { credentialId });
}
