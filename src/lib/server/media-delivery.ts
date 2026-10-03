type StoredMedia = { body: ReadableStream<Uint8Array>; length: number; range?: string; etag?: string };
type ReadMedia = (key: string, range?: string) => Promise<StoredMedia>;
const CHUNK = 16 * 1024 * 1024;
const BUDGET = 64 * 1024 * 1024;
const TTL = 5 * 60 * 1000;

/** Call only after a fresh owner/token/publication readiness and access check.
 * Immutable version keys let storage bytes be reused without caching permission.
 * The browser always revalidates, so revocation takes effect on its next request.
 */
export function createMediaDelivery(read: ReadMedia) {
  const bytes = new Map<string, { data: Uint8Array; media: Omit<StoredMedia, 'body'>; until: number }>();
  const metadata = new Map<string, { total: number; etag?: string; until: number }>();
  let used = 0;
  function forget(key: string) {
    const entry = bytes.get(key);
    if (entry) { used -= entry.data.byteLength; bytes.delete(key); }
  }
  return async function deliver(request: Request, key: string, mimeType: string): Promise<Response> {
    const now = Date.now();
    const known = metadata.get(key);
    const fresh = known && known.until > now ? known : undefined;
    const range = request.headers.get('range');
    if (range && fresh && request.headers.has('if-range') && request.headers.get('if-range') !== fresh.etag) {
      const headers = new Headers(request.headers); headers.delete('range'); headers.delete('if-range');
      return deliver(new Request(request.url, { method: request.method, headers }), key, mimeType);
    }
    if (range && !/^bytes=(\d+-\d*|-\d+)$/.test(range)) return new Response(null, { status: 416 });
    if (range && /^bytes=-0$/.test(range)) return new Response(null, { status: 416 });
    if (range && /^bytes=\d+-\d+$/.test(range)) {
      const [start, end] = range.slice(6).split('-').map(Number);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) return new Response(null, { status: 416 });
    }
    const headers = new Headers({ 'content-type': mimeType, 'accept-ranges': 'bytes',
      'cache-control': 'private, no-cache', 'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'same-origin' });
    const condition = request.headers.get('if-none-match');
    if (fresh?.etag && condition === fresh.etag && !range) {
      headers.set('etag', fresh.etag);
      return new Response(null, { status: 304, headers });
    }
    if (request.method === 'HEAD' && fresh) {
      headers.set('content-length', String(fresh.total));
      if (fresh.etag) headers.set('etag', fresh.etag);
      return new Response(null, { headers });
    }
    // An open-ended media range otherwise streams the whole original per seek.
    const prefix = range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = prefix ? Number(prefix[1]) : undefined;
    if (start !== undefined && !Number.isSafeInteger(start)) return new Response(null, { status: 416 });
    const bounded = start !== undefined
      ? `bytes=${start}-${Math.min(start + CHUNK - 1, prefix?.[2] ? Number(prefix[2]) : Number.MAX_SAFE_INTEGER)}`
      : range ?? undefined;
    const cacheKey = JSON.stringify([key, bounded ?? 'full']);
    const cached = bytes.get(cacheKey);
    let media: Omit<StoredMedia, 'body'>;
    let body: ReadableStream<Uint8Array> | Uint8Array;
    if (cached && cached.until > now) {
      bytes.delete(cacheKey); bytes.set(cacheKey, cached);
      media = cached.media; body = cached.data.slice();
    } else {
      forget(cacheKey);
      try {
        const result = await read(key, bounded);
        media = { length: result.length, range: result.range, etag: result.etag };
        const total = result.range ? Number(result.range.split('/')[1]) : result.length;
        if (Number.isFinite(total)) {
          metadata.delete(key);
          metadata.set(key, { total, etag: result.etag, until: now + TTL });
          if (metadata.size > 256) metadata.delete(metadata.keys().next().value!);
        }
        if (range && request.headers.has('if-range') && request.headers.get('if-range') !== result.etag) {
          await result.body.cancel();
          const headers = new Headers(request.headers); headers.delete('range'); headers.delete('if-range');
          return deliver(new Request(request.url, { method: request.method, headers }), key, mimeType);
        }
        if (request.method === 'HEAD') { await result.body.cancel(); body = new Uint8Array(); }
        else if (result.length <= CHUNK) {
          const data = new Uint8Array(await new Response(result.body).arrayBuffer());
          if (data.byteLength !== result.length) throw new Error('Incomplete media response');
          while (used + data.byteLength > BUDGET && bytes.size) forget(bytes.keys().next().value!);
          forget(cacheKey);
          bytes.set(cacheKey, { data, media, until: now + TTL }); used += data.byteLength;
          body = data.slice();
        } else body = result.body;
      } catch (cause) {
        const failure = cause as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (failure.name === 'NoSuchKey') return new Response(null, { status: 404, headers });
        if (failure.$metadata?.httpStatusCode === 416) return new Response(null, { status: 416, headers });
        throw cause;
      }
    }
    if (media.etag) headers.set('etag', media.etag);
    if (!range && condition === media.etag && media.etag) {
      if (body instanceof ReadableStream) await body.cancel();
      return new Response(null, { status: 304, headers });
    }
    headers.set('content-length', String(media.length));
    if (range && media.range) headers.set('content-range', media.range);
    return new Response(request.method === 'HEAD' ? null : body as BodyInit, { status: range ? 206 : 200, headers });
  };
}
