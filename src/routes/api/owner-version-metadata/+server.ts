import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json();
  if (!body || typeof body.versionId !== 'string' || !body.metadata) throw error(400, 'Version metadata required');
  try {
    const result = await db().mutation(personal.updateVersionMetadata, { versionId: body.versionId as Id<'assetVersions'>, metadata: body.metadata, expectedUpdatedAt: body.expectedUpdatedAt });
    return json({ ok: true, ...result }, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) {
    if (String(cause).includes('Metadata changed')) throw error(409, 'Metadata changed in another session. Reload before saving; your draft has been retained.');
    throw error(400, 'Could not save version metadata. Check the fields and image references.');
  }
};
