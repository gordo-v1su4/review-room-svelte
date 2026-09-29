import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import { api, internal } from '../../../../convex/_generated/api';
import type { Actions, PageServerLoad } from './$types';
import { ownerSignedIn, passwordMatches, startOwnerSession } from '$lib/server/owner-auth';
import { db } from '$lib/server/personal';

const email = (value: FormDataEntryValue | null) => String(value ?? '').trim().toLowerCase();

function authClient() {
  if (env.REVIEW_ROOM_CONVEX_URL !== 'https://review-convex.v1su4.dev') {
    throw new Error('Review Room authentication is not configured');
  }
  return new ConvexHttpClient(env.REVIEW_ROOM_CONVEX_URL);
}

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
  setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
  if (ownerSignedIn(cookies)) redirect(303, '/');
  return { providers: await authClient().query(api.auth.oauthProviders, {}) };
};

export const actions: Actions = {
  email: async ({ request, cookies }) => {
    const form = await request.formData();
    const address = email(form.get('email'));
    const password = String(form.get('password') ?? '');
    if (!address || !password) return fail(400, { invalid: true });
    try {
      const client = authClient();
      const result = await client.action(api.auth.signIn, {
        provider: 'password', params: { flow: 'signIn', email: address, password }
      });
      if (!result.tokens) return fail(401, { invalid: true });
      client.setAuth(result.tokens.token);
      const user = await client.query(api.auth.loggedInAppUser, {});
      if (user?.role !== 'admin') return fail(403, { unauthorized: true });
      startOwnerSession(cookies);
    } catch {
      return fail(401, { invalid: true });
    }
    redirect(303, '/');
  },
  create: async ({ request, cookies }) => {
    const form = await request.formData();
    const address = email(form.get('email'));
    const password = String(form.get('password') ?? '');
    const ownerPassword = String(form.get('ownerPassword') ?? '');
    if (address !== env.REVIEW_ROOM_OWNER_EMAIL?.toLowerCase() || !passwordMatches(ownerPassword)) {
      return fail(403, { setupInvalid: true });
    }
    if (password.length < 8) return fail(400, { setupInvalid: true });
    try {
      const client = authClient();
      const result = await client.action(api.auth.signIn, {
        provider: 'password', params: { flow: 'signUp', email: address, password }
      });
      if (!result.tokens) return fail(400, { setupInvalid: true });
      client.setAuth(result.tokens.token);
      const authUser = await client.query(api.auth.loggedInAuthUser, {});
      if (!authUser?._id || authUser.email?.toLowerCase() !== address) {
        return fail(400, { setupInvalid: true });
      }
      await db().mutation(internal.auth.bootstrapOwner, { authUserId: authUser._id });
      startOwnerSession(cookies);
    } catch {
      return fail(400, { setupInvalid: true });
    }
    redirect(303, '/');
  },
  legacy: async ({ request, cookies }) => {
    const form = await request.formData();
    if (!passwordMatches(String(form.get('password') ?? ''))) return fail(401, { legacyInvalid: true });
    startOwnerSession(cookies);
    redirect(303, '/');
  }
};
