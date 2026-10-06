import { test, expect } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';
import { createMediaDelivery } from '../src/lib/server/media-delivery';
import { createDestinationMediaHandler } from '../src/lib/server/destination-media';

const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })]
  .map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));

test('destination HTTP delivery supports CORS ranges and checks revocation before cached bytes or 304', async () => {
  const t = convexTest(schema, modules);
  const versionId = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'HTTP', slug: 'http', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Clip', originalFilename: 'clip.mp4', storageKey: 'private/clip.mp4', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    return ctx.db.insert('assetVersions', { assetId: asset, version: 1, originalKey: 'private/clip.mp4', mimeType: 'video/mp4', sizeBytes: 6, processingState: 'ready', createdAt: 1 });
  });
  const grant = await t.mutation(internal.publicationGrants.issue, { destinationKey: 'trailer-feed', versionId, allowedOrigins: ['https://portfolio.example'] });
  const deliver = createMediaDelivery(async (_key, range) => {
    const match = range?.match(/^bytes=(\d+)-(\d+)$/);
    const start = match ? Number(match[1]) : 0, end = match ? Math.min(Number(match[2]), 5) : 5;
    return { body: new Response(new TextEncoder().encode('abcdef').slice(start, end + 1)).body!, length: end - start + 1, range: match ? `bytes ${start}-${end}/6` : undefined, etag: '"clip-v1"' };
  });
  const handle = createDestinationMediaHandler(args => t.query(internal.publicationGrants.resolve, args), deliver);
  const params = { slug: grant.slug, versionId, variant: 'original' };
  const request = (method = 'GET', headers: Record<string, string> = {}) => new Request('https://review.test/api/destination-media/grant/version/original?cors=1', { method, headers: { Origin: 'https://portfolio.example', ...headers } });
  const part = await handle(request('GET', { Range: 'bytes=2-4' }), params);
  expect(part.status).toBe(206);
  expect(await part.text()).toBe('cde');
  expect(part.headers.get('access-control-allow-origin')).toBe('https://portfolio.example');
  expect(part.headers.get('content-range')).toBe('bytes 2-4/6');
  expect(part.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
  const head = await handle(request('HEAD'), params);
  expect(head.headers.get('content-length')).toBe('6');
  expect(await head.text()).toBe('');
  const options = await handle(request('OPTIONS', { 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'range' }), params);
  expect(options.status).toBe(204);
  expect(options.headers.get('access-control-allow-methods')).toBe('GET, HEAD, OPTIONS');
  expect((await handle(request('GET', { Origin: 'https://foreign.example' }), params)).status).toBe(404);
  expect((await handle(request('GET', { 'If-None-Match': '"clip-v1"' }), params)).status).toBe(304);
  await t.mutation(internal.publicationGrants.revoke, { grantId: grant.grantId });
  expect((await handle(request('GET', { Range: 'bytes=2-4' }), params)).status).toBe(404);
  expect((await handle(request('GET', { 'If-None-Match': '"clip-v1"' }), params)).status).toBe(404);
});
