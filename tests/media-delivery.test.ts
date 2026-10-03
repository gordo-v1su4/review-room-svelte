import { test, expect } from 'bun:test';
import { createMediaDelivery } from '../src/lib/server/media-delivery';

test('authorized media responses revalidate a private poster and preserve byte ranges', async () => {
  // Storage is the external seam; access checks remain in the real owner/review routes.
  const deliver = createMediaDelivery(async (_key, range) => {
    const bytes = new TextEncoder().encode('abcdef');
    const match = range?.match(/^bytes=(\d+)-(\d+)$/);
    const start = match ? Number(match[1]) : 0;
    const end = match ? Math.min(Number(match[2]), 5) : 5;
    return { body: new Response(bytes.slice(start, end + 1)).body!, length: end - start + 1,
      range: match ? `bytes ${start}-${end}/6` : undefined, etag: '"original"' };
  });
  const get = (headers?: HeadersInit) => new Request('https://review.test/media', { headers });
  const poster = await deliver(get(), 'poster-v1', 'image/jpeg');
  expect(await poster.text()).toBe('abcdef');
  expect(poster.headers.get('cache-control')).toBe('private, no-cache');
  const validated = await deliver(get({ 'If-None-Match': '"original"' }), 'poster-v1', 'image/jpeg');
  expect(validated.status).toBe(304);
  expect(await validated.text()).toBe('');
  const part = await deliver(get({ Range: 'bytes=2-4' }), 'video-v1', 'video/mp4');
  expect(part.status).toBe(206);
  expect(part.headers.get('content-range')).toBe('bytes 2-4/6');
  expect(await part.text()).toBe('cde');
  const replaced = await deliver(get({ Range: 'bytes=2-4', 'If-Range': '"previous-version"' }), 'video-v2', 'video/mp4');
  expect(replaced.status).toBe(200);
  expect(await replaced.text()).toBe('abcdef');
});

test('warm private media survives a storage outage and a new version never serves old bytes', async () => {
  let offline = false;
  const deliver = createMediaDelivery(async key => {
    if (offline) throw new Error('Storage temporarily offline');
    const data = new TextEncoder().encode(key === 'v1' ? 'old' : 'new');
    return { body: new Response(data).body!, length: 3, etag: `"${key}"` };
  });
  const get = () => new Request('https://review.test/media');
  expect(await (await deliver(get(), 'v1', 'video/mp4')).text()).toBe('old');
  offline = true;
  expect(await (await deliver(get(), 'v1', 'video/mp4')).text()).toBe('old');
  offline = false;
  expect(await (await deliver(get(), 'v2', 'video/mp4')).text()).toBe('new');
  expect((await deliver(new Request('https://review.test/media', { method: 'HEAD' }), 'v2', 'video/mp4')).headers.get('content-length')).toBe('3');
});

test('open-ended seeks return bounded contiguous ranges and malformed ranges are rejected', async () => {
  const deliver = createMediaDelivery(async (_key, range) => {
    const match = range!.match(/^bytes=(\d+)-(\d+)$/)!;
    const start = Number(match[1]), end = Number(match[2]);
    const data = new Uint8Array(end - start + 1).fill(7);
    return { body: new Response(data).body!, length: data.byteLength, range: `bytes ${start}-${end}/9000000`, etag: '"v1"' };
  });
  const response = await deliver(new Request('https://review.test/media', { headers: { Range: 'bytes=2000000-' } }), 'v1', 'video/mp4');
  expect(response.status).toBe(206);
  expect(response.headers.get('content-range')).toBe('bytes 2000000-3048575/9000000');
  expect((await response.arrayBuffer()).byteLength).toBe(1048576);
  for (const range of ['bytes=4-2', 'bytes=0-1,3-4', 'bytes=-0']) {
    expect((await deliver(new Request('https://review.test/media', { headers: { Range: range } }), 'v1', 'video/mp4')).status).toBe(416);
  }
});
