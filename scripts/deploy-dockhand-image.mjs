import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const revision = process.argv[2];
assert(/^[a-f0-9]{7,40}$/.test(revision ?? ''), 'Provide a committed revision');
const base = 'http://100.105.199.93:13000';
const path = '/api/stacks/review-room-svelte-app/compose?env=3';
const before = await fetch(base + path);
assert(before.ok, 'Managed stack unavailable');
const stack = await before.json();
assert(stack.content.includes('name: review-room-svelte-app'), 'Unexpected stack');
assert(stack.content.includes('127.0.0.1:18094:3000'), 'Unexpected origin port');
assert(stack.content.includes('pull_policy: never'), 'Unexpected image pull policy');
assert(stack.content.includes('ORIGIN: https://review.v1su4.dev'), 'Unexpected domain');
const image = `review-room-svelte-app-app:${revision}`;
assert(/image: review-room-svelte-app-app:[a-f0-9]+/.test(stack.content), 'Unexpected image');
if (process.argv.includes('--verify')) {
  assert(stack.content.includes('image: ' + image), 'Managed image differs');
  console.log(JSON.stringify({ image, managed: true, composeMatches: true }));
  process.exit(0);
}
writeFileSync(`.scratch/release-readiness/compose-before-${revision}.yaml`, stack.content);
const content = stack.content.replace(/image: review-room-svelte-app-app:[a-f0-9]+/, 'image: ' + image);
// Save first: Dockhand's restart-only path may deploy without retaining Compose.
const saved = await fetch(base + path, { method: 'PUT', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ content, restart: false }) });
assert(saved.ok && (await saved.json()).success, 'Managed compose save failed');
const result = await fetch(base + '/api/stacks/review-room-svelte-app/deploy?env=3', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', origin: base }, body: JSON.stringify({ pull: false, build: false, forceRecreate: true }) });
assert(result.ok, `Managed deploy failed (${result.status})`);
assert((await result.json()).success === true, 'Managed deploy did not report success');
const after = await (await fetch(base + path)).json();
assert(after.content === content, 'Managed compose did not retain exact image change');
console.log(JSON.stringify({ image, managed: true, applied: true, environment: 'app-vm', composeMatches: true }));
