import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, personal } from '$lib/server/personal';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const showcase = await db().query(personal.publicShowcase, { slug: params.slug });
  if (!showcase) throw error(404, 'Showcase unavailable');
  setHeaders({ 'cache-control': 'no-store', 'content-security-policy': `frame-ancestors 'self' ${showcase.allowedOrigins.join(' ')}`,
    'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' });
  return { showcase };
};
