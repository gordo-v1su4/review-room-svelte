import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal, removeUploadStaging } from '$lib/server/personal';
export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const { sessionId } = await request.json();
  const id = String(sessionId) as Id<'uploadSessions'>;
  const session = await db().query(personal.uploadSession, { sessionId: id });
  const result = await db().mutation(personal.cancelUpload, { sessionId: id });
  if (result.cancelled) await removeUploadStaging(session.objectKey);
  return json(result, { headers: { 'cache-control': 'no-store' } });
};
