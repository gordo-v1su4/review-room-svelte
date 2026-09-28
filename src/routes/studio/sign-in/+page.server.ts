import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ownerSignedIn, passwordMatches, startOwnerSession } from '$lib/server/owner-auth';

export const load: PageServerLoad = ({ cookies, setHeaders }) => {
  setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
  if (ownerSignedIn(cookies)) redirect(303, '/');
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    if (!passwordMatches(String(form.get('password') ?? ''))) return fail(401, { invalid: true });
    startOwnerSession(cookies);
    redirect(303, '/');
  }
};
