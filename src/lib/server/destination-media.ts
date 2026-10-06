type ResolveArgs = { slug: string; versionId: string; variant: 'original' | 'poster'; origin?: string };
type Lookup = (args: ResolveArgs) => Promise<{ key: string; mimeType: string } | null>;
type Deliver = (request: Request, key: string, mimeType: string) => Promise<Response>;

/** Authorization is deliberately outside the byte cache, including conditional responses. */
export function createDestinationMediaHandler(lookup: Lookup, deliver: Deliver) {
  return async (request: Request, params: { slug: string; versionId: string; variant: string }) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD, OPTIONS' } });
    if (params.variant !== 'original' && params.variant !== 'poster') return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
    const origin = request.headers.get('origin') ?? undefined;
    const media = await lookup({ slug: params.slug, versionId: params.versionId, variant: params.variant, origin });
    if (!media) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store', Vary: 'Origin' } });
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('access-control-request-method');
      const requestedHeaders = (request.headers.get('access-control-request-headers') ?? '').toLowerCase().split(',').map(header => header.trim()).filter(Boolean);
      if (!origin || !method || !['GET', 'HEAD'].includes(method) || requestedHeaders.some(header => !['range', 'if-range', 'if-none-match'].includes(header))) return new Response(null, { status: 400, headers: { 'cache-control': 'no-store' } });
    }
    const response = request.method === 'OPTIONS' ? new Response(null, { status: 204 }) : await deliver(request, media.key, media.mimeType);
    const headers = new Headers(response.headers);
    headers.set('cache-control', 'private, no-cache');
    headers.set('cross-origin-resource-policy', 'cross-origin');
    headers.append('vary', 'Origin');
    if (origin) {
      headers.set('access-control-allow-origin', origin);
      headers.set('access-control-expose-headers', 'Content-Length, Content-Range, Accept-Ranges, ETag');
      if (request.method === 'OPTIONS') {
        headers.set('access-control-allow-methods', 'GET, HEAD, OPTIONS');
        headers.set('access-control-allow-headers', 'Range, If-Range, If-None-Match');
        headers.set('access-control-max-age', '0');
        headers.append('vary', 'Access-Control-Request-Method, Access-Control-Request-Headers');
      }
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
}
