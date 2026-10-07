import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Publishes only short-lived synthetic QA image capabilities, never a target project.
// Capability URLs/cookies remain process-local; all grants are revoked in finally.
const base = 'https://review.v1su4.dev';
const origin = 'https://www.trailerfeed.video';
const evidence = JSON.parse(readFileSync('.scratch/release-readiness/v1s164-live-summary.json', 'utf8'));
const grants = [];
let cookie;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function owner(method, body) {
  return fetch(base + '/api/owner-publication-grants', { method, headers: { cookie, origin: base, 'content-type': 'application/json' }, body: JSON.stringify(body), redirect: 'manual' });
}
async function issue(versionId, referenceVersionIds, expiresAt) {
  const response = await owner('POST', { destinationKey: 'trailer-feed', versionId, referenceVersionIds, allowedOrigins: [origin], expiresAt });
  assert.equal(response.status, 200, 'Synthetic grant issuance failed');
  const grant = await response.json();
  grants.push(grant);
  assert(!/originalKey|storageKey|posterKey|spriteKey|accessKey|secretKey/.test(JSON.stringify(grant)), 'Grant descriptor leaked storage/service identity');
  return grant;
}
function media(grant, versionId = grant.versionId) {
  return base + '/api/destination-media/' + grant.slug + '/' + versionId + '/original?cors=1';
}
async function get(url, options = {}) {
  return fetch(url, { ...options, headers: { origin, ...options.headers } });
}
try {
  const auth = await fetch(base + '/studio/sign-in?/email', { method: 'POST', redirect: 'manual',
    headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'gordo@v1su4.com', password: process.env.PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD }) });
  cookie = auth.headers.get('set-cookie')?.split(';')[0];
  assert(cookie, 'Owner session unavailable');
  const originalBytes = readFileSync('.scratch/review-trailer-sync/live-qa/poster.jpg');
  const newBytes = readFileSync('.scratch/review-trailer-sync/live-qa/poster-v2.jpg');
  const grant = await issue(evidence.currentImageVersionId, [evidence.pinnedImageVersionId], Date.now() + 60_000);
  const url = media(grant);
  const full = await get(url);
  assert.equal(full.status, 200, 'Ready root image delivery failed');
  assert.equal(hash(Buffer.from(await full.arrayBuffer())), hash(newBytes), 'Root exact-version bytes differ');
  assert.equal(full.headers.get('access-control-allow-origin'), origin, 'CORS origin mismatch');
  const etag = full.headers.get('etag');
  assert(etag, 'Media ETag unavailable');
  const reference = await get(media(grant, evidence.pinnedImageVersionId));
  assert.equal(reference.status, 200, 'Allowed reference unavailable');
  assert.equal(hash(Buffer.from(await reference.arrayBuffer())), hash(originalBytes), 'Reference changed to newer image');
  const range = await get(url, { headers: { range: 'bytes=0-31' } });
  assert.equal(range.status, 206, 'Range did not return partial content');
  assert.equal(range.headers.get('content-range'), 'bytes 0-31/' + newBytes.length, 'Incorrect range boundary');
  assert.deepEqual(Buffer.from(await range.arrayBuffer()), newBytes.subarray(0, 32), 'Partial bytes differ');
  const head = await get(url, { method: 'HEAD' });
  assert.equal(head.status, 200, 'Authorized HEAD failed');
  assert.equal(Number(head.headers.get('content-length')), newBytes.length, 'HEAD length differs');
  assert.equal((await head.arrayBuffer()).byteLength, 0, 'HEAD returned a body');
  assert.equal((await get(url, { headers: { 'if-none-match': etag } })).status, 304, 'Valid conditional request failed');
  assert.equal((await get(url, { headers: { range: 'bytes=999999999-' } })).status, 416, 'Invalid range was accepted');
  assert.equal((await get(url, { headers: { origin: 'https://unrelated.invalid' } })).status, 404, 'Unconsented origin accessed media');
  assert.equal((await get(media(grant, evidence.videoVersionId))).status, 404, 'Unselected same-project version accessed media');
  const preflight = await get(url, { method: 'OPTIONS', headers: { 'access-control-request-method': 'GET', 'access-control-request-headers': 'range,if-none-match' } });
  assert.equal(preflight.status, 204, 'Authorized range preflight failed');
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin, 'Preflight origin differs');
  const invalidPreflight = await get(url, { method: 'OPTIONS', headers: { 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } });
  assert.equal(invalidPreflight.status, 400, 'Unapproved preflight headers accepted');
  const expiresAt = Date.now() + 2500;
  const expiring = await issue(evidence.pinnedImageVersionId, [], expiresAt);
  const expiryWarm = await get(media(expiring));
  assert.equal(expiryWarm.status, 200, 'Expiry fixture never warmed');
  const expiryEtag = expiryWarm.headers.get('etag');
  await expiryWarm.arrayBuffer();
  await new Promise(resolve => setTimeout(resolve, Math.max(0, expiresAt - Date.now()) + 100));
  assert.equal((await get(media(expiring), { headers: { 'if-none-match': expiryEtag } })).status, 404, 'Expired warm grant produced media/304');
  assert.equal((await get(media(expiring), { method: 'HEAD' })).status, 404, 'Expired HEAD remained authorized');
  const revoked = await owner('DELETE', { grantId: grant.grantId, expectedGeneration: grant.consentGeneration });
  assert.equal(revoked.status, 200, 'Revocation failed');
  assert.equal((await get(url, { headers: { 'if-none-match': etag } })).status, 404, 'Revoked warm grant produced media/304');
  assert.equal((await get(media(grant, evidence.pinnedImageVersionId), { headers: { range: 'bytes=0-31' } })).status, 404, 'Revoked reference remained readable');
  const summary = { releaseVersion: await (await fetch(base + '/_app/version.json')).json(),
    qaOnly: true, exactRootAndPinnedReference: true, root: 200, reference: 200, range: 206, head: 200,
    conditional: 304, invalidRange: 416, wrongOrigin: 404, unselectedVersion: 404,
    preflight: 204, invalidPreflight: 400, expiredWarmConditional: 404, expiredHead: 404,
    revokedWarmConditional: 404, revokedReferenceRange: 404, noTargetRegistration: true };
  writeFileSync('.scratch/release-readiness/v1s165-live-summary.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : 'Live grant acceptance failed');
  process.exitCode = 1;
} finally {
  for (const grant of grants) {
    const response = await owner('DELETE', { grantId: grant.grantId, expectedGeneration: grant.consentGeneration });
    if (!response.ok) { console.error('QA grant finalizer could not confirm revocation'); process.exitCode = 1; }
  }
}
