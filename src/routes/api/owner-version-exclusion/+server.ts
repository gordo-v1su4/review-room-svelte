import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json();
  if (typeof body?.versionId !== 'string' || typeof body?.excluded !== 'boolean') throw error(400, 'Version and excluded flag required');
  const result = await db().mutation(personal.setVersionExcluded, { versionId: body.versionId as Id<'assetVersions'>, excluded: body.excluded });
  return json(result, { headers: { 'cache-control': 'no-store' } });
};
