import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { internal } from '../../../../convex/_generated/api';
import { requireOwner } from '$lib/server/owner-auth';
import { db } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.observedIds) || body.observedIds.length > 100 || body.observedIds.some((id: unknown) => typeof id !== 'string' || id.length > 150)) throw error(400, 'Activity observation required');
  return json(await db().query(internal.workActivity.list, { now: Date.now(), observedIds: body.observedIds }), { headers: { 'cache-control': 'private, no-store' } });
};
