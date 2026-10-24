import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const base = 'https://review.v1su4.dev';
const results = [];
for (const [path, marker] of [
  ['/docs', 'From first upload'], ['/docs/organization', 'BLR_EP101_PRL_0020_v003'],
  ['/docs/review', 'Make the decision clear.'], ['/docs/agents', 'Connect to the catalog.'],
  ['/docs/media-flow.html', 'text/html'], ['/docs/metadata-model.html', 'text/html'],
  ['/agent-api', '# Review Room agent API'], ['/review-room-openapi.json', 'openapi'],
  ['/docs/images/review-workspace-20261024.png', 'image/png'], ['/docs/images/private-sharing-20261024.png', 'image/png'],
]) {
  const response = await fetch(base + path, { cache: 'no-store' });
  assert.equal(response.status, 200, path);
  if (marker.includes('/')) assert(response.headers.get('content-type')?.includes(marker), path);
  else assert((await response.text()).includes(marker), path);
  results.push({ path, status: response.status });
}
for (const path of ['/docs/operations', '/docs/operations/__data.json', '/docs/operations/runbook.md']) {
  for (const [session, cookie] of [['anonymous', ''], ['collaborator-only', 'review_access=collaborator'], ['forged-owner', 'rr_owner=9999999999.forged']]) {
    const response = await fetch(base + path, { headers: { cookie }, redirect: 'manual', cache: 'no-store' });
    const body = await response.text();
    assert([200, 303].includes(response.status), path);
    assert((response.headers.get('location') ?? body).includes('/studio/sign-in'), path);
    assert.equal(response.headers.get('cache-control'), 'private, no-store', path);
    assert(response.headers.get('vary')?.toLowerCase().includes('cookie'), path);
    assert(!body.includes('Deployment and recovery') && !body.includes('/opt/'), path);
    results.push({ path, session, status: response.status, privateNoStore: true, denied: true });
  }
}
const build = await fetch(base + '/_app/version.json', { cache: 'no-store' }).then(r => r.json());
const evidence = { checkedAt: new Date().toISOString(), release: '62d90062268f9f5bdcb35e87e1e0f1b89f92fead', build: build.version, results };
writeFileSync(new URL('./evidence/live-routes-20261024.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
