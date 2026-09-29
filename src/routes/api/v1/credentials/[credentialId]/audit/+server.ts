import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { requireOwner } from '$lib/server/owner-auth';

export const GET: RequestHandler = async ({ cookies, params }) => {
  requireOwner(cookies);
  const entries = await db().query(internal.automation.audit,
    { credentialId: params.credentialId as Id<'automationCredentials'> });
  return json({ entries }, { headers: { 'cache-control': 'private, no-store' } });
};
