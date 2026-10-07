import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const revision = process.argv[2];
assert(/^[a-f0-9]{40}$/.test(revision ?? ''), 'Expected full committed revision');
assert(process.env.GITHUB_REF === 'refs/heads/main', 'Deploy only main');
const root = `/home/gordo/review-room-svelte-releases/${revision}`;
const image = `review-room-svelte-app-app:${revision}`;
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  assert(result.status === 0, `${command} failed`);
  return result.stdout;
};
const capture = (command, args) => run(command, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
mkdirSync(root, { recursive: true });
const archive = spawnSync('git', ['archive', revision], { maxBuffer: 128 * 1024 * 1024 });
assert(archive.status === 0, 'Git export failed');
run('tar', ['-x', '-C', root], { input: archive.stdout, stdio: ['pipe', 'inherit', 'inherit'] });
const deps = `review-room-deploy-dependencies:${revision}`;
run('docker', ['build', '--target', 'dependencies', '-t', deps, root]);
const mount = ['--rm', '-v', `${root}:/app`, '-w', '/app'];
run('docker', ['run', ...mount, deps, 'sh', '-c', 'bun install --frozen-lockfile && bun run check && bun test']);
run('docker', ['build', '-t', image, root]);

// Keep credentials on App VM. Only the dedicated Convex deploy key enters this process.
const privateEnv = capture('sudo', ['-n', 'cat', '/opt/review-room-svelte-app/private.env']);
const adminLine = privateEnv.split('\n').find(line => line.startsWith('REVIEW_ROOM_CONVEX_ADMIN_KEY='));
assert(adminLine, 'Dedicated Review Convex deploy key unavailable');
const adminKey = adminLine.slice(adminLine.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
run('docker', ['run', ...mount, '-e', 'CONVEX_SELF_HOSTED_ADMIN_KEY', '-e', 'CONVEX_SELF_HOSTED_URL', deps,
  'bunx', 'convex', 'deploy', '--yes'], { env: { ...process.env,
    CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
    CONVEX_SELF_HOSTED_URL: 'https://review-convex.v1su4.dev' } });

const dockhand = 'http://100.105.199.93:13000';
const stackPath = '/api/stacks/review-room-svelte-app/compose?env=3';
const before = await fetch(dockhand + stackPath);
assert(before.ok, 'Dockhand stack unavailable');
const original = (await before.json()).content;
const previous = original.match(/image: review-room-svelte-app-app:([a-f0-9]+)/)?.[1];
assert(previous, 'Unexpected managed image');
mkdirSync(root + '/.scratch/release-readiness', { recursive: true });
writeFileSync(root + '/.scratch/release-readiness/compose-before.yaml', original);
try {
  run('node', [root + '/scripts/deploy-dockhand-image.mjs', revision], { cwd: root });
  let healthy = false;
  for (let attempt = 0; attempt < 36; attempt++) {
    const state = capture('docker', ['inspect', 'review-room-svelte-app-app-1', '--format', '{{.Config.Image}} {{.State.Health.Status}}']);
    if (state === `${image} healthy`) { healthy = true; break; }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  assert(healthy, 'New frontend did not become healthy');
  const originVersion = JSON.parse(capture('docker', ['exec', 'review-room-svelte-app-app-1', 'node', '-e',
    "fetch('http://127.0.0.1:3000/_app/version.json').then(r=>r.text()).then(console.log)"]));
  const publicVersion = await fetch('https://review.v1su4.dev/_app/version.json', { cache: 'no-store' });
  assert(publicVersion.ok, 'Public build unavailable');
  assert((await publicVersion.json()).version === originVersion.version, 'Public build differs from running image');
  const signIn = await fetch('https://review.v1su4.dev/studio/sign-in');
  assert(signIn.ok, 'Public sign-in unavailable');
  const anonymous = await fetch('https://review.v1su4.dev/', { redirect: 'manual' });
  assert([302, 303].includes(anonymous.status) && anonymous.headers.get('location')?.includes('sign-in'), 'Anonymous workspace gate failed');
  console.log(JSON.stringify({ revision, image, health: 'healthy', publicBuild: originVersion.version, privateWorkspace: true }));
} catch (error) {
  console.error('Frontend verification failed; restoring previous managed image. Convex deployment remains separate.');
  run('node', [root + '/scripts/deploy-dockhand-image.mjs', previous], { cwd: root });
  throw error;
}
