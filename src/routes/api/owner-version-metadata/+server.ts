import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ConvexError } from 'convex/values';
import { ownerSignedIn } from '$lib/server/owner-auth';
import { db, personal } from '$lib/server/personal';

export const GET: RequestHandler = async ({ cookies, url }) => {
  if (!ownerSignedIn(cookies)) return json({ message: 'Sign in again to access version metadata.' }, { status: 401, headers: { 'cache-control': 'private, no-store' } });
  const versionId = url.searchParams.get('versionId');
  if (!versionId) throw error(400, 'Version required');
  const details = await db().query(personal.versionDetails, { versionId });
  if (!details) throw error(404, 'Version unavailable');
  return json(details, { headers: { 'cache-control': 'private, no-store' } });
};

export const POST: RequestHandler = async ({ cookies, request }) => {
  if (!ownerSignedIn(cookies)) return json({ message: 'Sign in again before saving. Your draft is retained.' }, { status: 401, headers: { 'cache-control': 'private, no-store' } });
  let body;
  try { body = await request.json(); }
  catch { throw error(400, 'Invalid JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
    typeof body.versionId !== 'string' || !body.versionId ||
    !body.metadata || typeof body.metadata !== 'object' || Array.isArray(body.metadata) ||
    (body.expectedUpdatedAt !== null &&
      (!Number.isSafeInteger(body.expectedUpdatedAt) || body.expectedUpdatedAt < 0))) throw error(400, 'Version metadata required');
  try {
    const result = await db().mutation(personal.updateVersionMetadata, { versionId: body.versionId, metadata: body.metadata, expectedUpdatedAt: body.expectedUpdatedAt });
    return json({ ok: true, ...result }, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) {
    const data = cause instanceof ConvexError ? cause.data : null;
    const code = data && typeof data === 'object' && 'code' in data ? data.code : null;
    if (code === 'METADATA_CONFLICT') throw error(409, 'Metadata changed in another session. Reload before saving; your draft has been retained.');
    if (code === 'VERSION_UNAVAILABLE') throw error(404, 'Version unavailable');
    if (code === 'INVALID_VERSION_METADATA') throw error(400, data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : 'Invalid creative metadata');
    if (code === 'IMAGE_REFERENCE_UNAVAILABLE') throw error(400, 'Could not save version metadata. Check the image references.');
    throw cause;
  }
};
