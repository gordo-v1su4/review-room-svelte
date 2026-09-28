import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, personal } from '$lib/server/personal';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const publication = await db().query(personal.publicPublication, { slug: params.slug });
  if (!publication) throw error(404, 'Video unavailable');
  setHeaders({ 'cache-control': 'no-store', 'content-security-policy': `frame-ancestors 'self' ${publication.allowedOrigins.join(' ')}`,
    'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' });
  return { publication };
};
