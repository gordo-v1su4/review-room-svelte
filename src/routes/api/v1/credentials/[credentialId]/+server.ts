import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { requireOwner } from '$lib/server/owner-auth';

export const DELETE: RequestHandler = async ({ cookies, params }) => {
  requireOwner(cookies);
  const credentialId = await db().mutation(internal.automation.revoke,
    { credentialId: params.credentialId as Id<'automationCredentials'> });
  return json({ credentialId, revoked: true }, { headers: { 'cache-control': 'private, no-store' } });
};
