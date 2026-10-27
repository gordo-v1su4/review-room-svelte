import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createHmac, randomBytes } from 'node:crypto';
import { createServer } from 'node:net';

// Agreed seam: real HTTP responses, including SvelteKit data requests and cache headers.
const secret = randomBytes(32).toString('hex');
let server: ReturnType<typeof Bun.spawn>;
let base: string;
beforeAll(async () => {
  const socket = createServer();
  await new Promise<void>(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  // The pinned Bun-only dependencies image may not include a Node binary.
  server = Bun.spawn([Bun.which('node') ?? process.execPath, 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    env: { ...process.env, REVIEW_ROOM_SESSION_SECRET: secret }, stdout: 'pipe', stderr: 'pipe',
  });
  const reader = (server.stdout as ReadableStream<Uint8Array>).getReader();
  let output = '';
  while (!base) {
    const { value, done } = await reader.read();
    if (done) throw new Error('Docs test server stopped before becoming ready');
    output += new TextDecoder().decode(value).replace(/\u001b\[[0-9;]*m/g, '');
    const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
    if (match) base = match[0];
  }
  reader.releaseLock();
}, 30000);
afterAll(() => server?.kill());

function ownerCookie(expiry = Math.floor(Date.now() / 1000) + 60) {
  return `rr_owner=${expiry}.${createHmac('sha256', secret).update(String(expiry)).digest('hex')}`;
}
const get = (path: string, cookie = '') => fetch(base + path, { headers: { cookie }, redirect: 'manual' });

test('operations denies anonymous, collaborator, forged and expired owner sessions on direct and data URLs', async () => {
  for (const path of ['/docs/operations', '/docs/operations/__data.json', '/docs/operations/runbook.md']) {
    for (const cookie of ['', 'review_access=collaborator', 'rr_owner=9999999999.forged', ownerCookie(1)]) {
      const response = await get(path, cookie);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('vary')).toContain('Cookie');
      expect([200, 303]).toContain(response.status); // SvelteKit encodes data redirects as JSON.
      const body = await response.text();
      expect(response.headers.get('location') ?? body).toContain('/studio/sign-in');
      expect(body).not.toContain('Deployment and recovery');
      expect(body).not.toContain('/opt/');
    }
  }
}, 30000);

test('a valid owner can read operations, with private non-indexable responses', async () => {
  const response = await get('/docs/operations', ownerCookie());
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  expect(await response.text()).toContain('Deployment and recovery');
  const data = await get('/docs/operations/__data.json', ownerCookie());
  expect(data.status).toBe(200);
  expect(data.headers.get('cache-control')).toBe('private, no-store');
  expect(await data.text()).toContain('Deployment and recovery');
  const runbook = await get('/docs/operations/runbook.md', ownerCookie());
  expect(runbook.status).toBe(200);
  expect(runbook.headers.get('cache-control')).toBe('private, no-store');
  expect(await runbook.text()).toContain('# Personal Review Room deployment');
}, 30000);

test('public guides and both established diagram URLs remain readable without owner access', async () => {
  for (const path of ['/docs', '/docs/organization', '/docs/review', '/docs/agents', '/docs/media-flow.html', '/docs/metadata-model.html']) {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('/opt/review-room');
  }
}, 30000);


test('established diagram pages keep navigation and a complete static diagram', async () => {
  for (const [path, title] of [
    ['/docs/media-flow.html', 'Review Room media flow'],
    ['/docs/metadata-model.html', 'Review Room core metadata relationships'],
  ]) {
    const response = await get(path);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain('aria-label="Documentation sections"');
    expect(body).toContain('aria-controls="docs-navigation"');
    expect(body).toMatch(new RegExp('href="[^"]*' + path.slice(1).replaceAll('.', '\\.') + '"[^>]*aria-current="page"'));
    expect(body).toContain(title);
    expect(body).not.toContain('data-motion-controls');
    expect(body).not.toContain('data-motion-root');
  }
  expect((await get('/docs/unknown.html')).status).toBe(404);
}, 30000);
