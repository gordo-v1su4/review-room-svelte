import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const input = await request.json().catch(() => null);
  if (!input || typeof input.projectId !== 'string' || !input.projectId ||
    !Array.isArray(input.assetIds) || !input.assetIds.length || input.assetIds.length > 50 ||
    input.assetIds.some((id: unknown) => typeof id !== 'string' || !id || id.length > 100)) {
    throw error(400, 'Select between 1 and 50 clips from one project.');
  }
  try {
    const result = await db().mutation(personal.deleteSelectedAssets, {
      projectId: input.projectId as Id<'projects'>,
      assetIds: input.assetIds as Id<'videos'>[]
    });
    return json(result, { headers: { 'cache-control':'private, no-store' } });
  } catch {
    throw error(409, 'Could not delete these clips. Wait for processing or replacement uploads to finish, then select the clips again.');
  }
};
