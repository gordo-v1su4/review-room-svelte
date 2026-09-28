import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal, verifiedObject } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const { sessionId } = await request.json();
  const session = await db().query(personal.uploadSession, { sessionId: String(sessionId) as Id<'uploadSessions'> });
  if (session.status !== 'pending' || session.expiresAt < Date.now()) throw error(409, 'Upload session expired');
  const object = await verifiedObject(session.objectKey);
  if (object.ContentLength !== session.sizeBytes || object.ContentType !== session.mimeType) {
    throw error(409, 'Uploaded original did not match the session');
  }
  const assetId = await db().mutation(personal.finalizeUpload, {
    sessionId: session._id, verifiedSizeBytes: object.ContentLength, etag: object.ETag
  });
  return json({ assetId }, { headers: { 'cache-control': 'no-store' } });
};
