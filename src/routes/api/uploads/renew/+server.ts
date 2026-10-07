import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal, posterKey, stagingKey, uploadUrl } from '$lib/server/personal';
export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const { sessionId } = await request.json();
  const session = await db().query(personal.uploadSession, { sessionId: String(sessionId) as Id<'uploadSessions'> });
  if (session.status === 'complete') return json({ complete: true }, { headers: { 'cache-control': 'no-store' } });
  if (session.status !== 'pending' || session.expiresAt <= Date.now()) throw error(409, 'Upload session is no longer available. Start this file again.');
  return json({ sessionId: session._id, url: await uploadUrl(stagingKey(session.objectKey), session.mimeType), posterUrl: await uploadUrl(stagingKey(posterKey(session.objectKey)), 'image/jpeg'), expiresAt: session.expiresAt }, { headers: { 'cache-control': 'no-store' } });
};
