import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  if (env.REVIEW_ROOM_CONVEX_URL) redirect(303, '/studio');
};
