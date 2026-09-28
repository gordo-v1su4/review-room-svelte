import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal, uploadUrl } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json();
  const session = await db().mutation(personal.beginUpload, {
    projectId: String(body.projectId) as Id<'projects'>,
    assetId: body.assetId ? String(body.assetId) as Id<'videos'> : undefined,
    originalFilename: String(body.name), mimeType: String(body.type), sizeBytes: Number(body.size)
  });
  const url = await uploadUrl(session.objectKey, String(body.type));
  return json({ sessionId: session.sessionId, url, expiresAt: session.expiresAt }, { headers: { 'cache-control': 'no-store' } });
};
