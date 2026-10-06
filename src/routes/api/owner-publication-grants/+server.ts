import { json, error } from '@sveltejs/kit';
import { ConvexError } from 'convex/values';
import type { RequestHandler } from './$types';
import { internal } from '../../../../convex/_generated/api';
import { requireOwner } from '$lib/server/owner-auth';
import { db } from '$lib/server/personal';

function grantError(cause: unknown): never {
  const data = cause instanceof ConvexError ? cause.data : null;
  const code = data && typeof data === 'object' && 'code' in data ? data.code : null;
  if (code === 'GRANT_VERSION_UNAVAILABLE' || code === 'GRANT_UNAVAILABLE') throw error(404, 'Publication selection unavailable');
  if (code === 'GRANT_MEDIA_NOT_READY') throw error(409, 'Wait for all selected media to finish processing');
  if (code === 'GRANT_REVOKED' || code === 'GRANT_EXPIRED' || code === 'GRANT_CONSENT_CHANGED') throw error(409, 'Publication consent changed. Confirm a new sync operation.');
  if (code === 'GRANT_ORIGIN_REQUIRED' || code === 'GRANT_INVALID_EXPIRY' || code === 'GRANT_TOO_MANY_REFERENCES' || code === 'GRANT_REFERENCE_UNAVAILABLE') throw error(400, 'Invalid publication selection, destination origin, or expiry');
  throw cause;
}

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  let body;
  try { body = await request.json(); } catch { throw error(400, 'Invalid JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.destinationKey !== 'trailer-feed' || typeof body.versionId !== 'string' || !body.versionId ||
    !Array.isArray(body.allowedOrigins) || body.allowedOrigins.length > 12 || body.allowedOrigins.some((origin: unknown) => typeof origin !== 'string') ||
    !Array.isArray(body.referenceVersionIds) || body.referenceVersionIds.length > 21 || body.referenceVersionIds.some((id: unknown) => typeof id !== 'string') ||
    (body.expiresAt !== undefined && !Number.isSafeInteger(body.expiresAt))) throw error(400, 'Explicit publication selection required');
  try {
    const grant = await db().mutation(internal.publicationGrants.issue, {
      destinationKey: body.destinationKey, versionId: body.versionId, allowedOrigins: body.allowedOrigins,
      referenceVersionIds: body.referenceVersionIds, ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt } : {}),
    });
    return json(grant, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) { grantError(cause); }
};

export const DELETE: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  let body;
  try { body = await request.json(); } catch { throw error(400, 'Invalid JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.grantId !== 'string' || !body.grantId) throw error(400, 'Grant required');
  try {
    return json(await db().mutation(internal.publicationGrants.revoke, { grantId: body.grantId }), { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) { grantError(cause); }
};
