import guide from '../../../docs/agent-api.md?raw';
export const GET = () => new Response(guide, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=300' } });
