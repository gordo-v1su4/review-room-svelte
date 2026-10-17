import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { ConvexError } from 'convex/values';
import { automationBearer, automationError, automationRequest } from '$lib/server/automation-http';

export const GET: RequestHandler = async event => {
  try {
    const result = await db().mutation(internal.automation.versionMetadata, {
      keyDigest: automationBearer(event), versionId: event.params.versionId as Id<'assetVersions'>,
    });
    return json(result, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) { return automationError(cause); }
};

/** Replaces a version's creative metadata (model, prompt, references, gridImageVersionId, notes). */
export const PUT: RequestHandler = async event => {
  try {
    const body = await event.request.json();
    if (!body || typeof body !== 'object' || typeof body.metadata !== 'object' || body.metadata === null) return json({ error: 'Provide a metadata object' }, { status: 400 });
    if (body.expectedUpdatedAt !== undefined && body.expectedUpdatedAt !== null && !Number.isSafeInteger(body.expectedUpdatedAt)) return json({ error: 'expectedUpdatedAt must be the revision from a previous read, or null' }, { status: 400 });
    const payload = { versionId: event.params.versionId as Id<'assetVersions'>, metadata: body.metadata,
      ...(body.expectedUpdatedAt !== undefined ? { expectedUpdatedAt: body.expectedUpdatedAt as number | null } : {}) };
    const auth = automationRequest(event, payload);
    const result = await db().mutation(internal.automation.updateVersionMetadata, { ...auth, ...payload });
    return json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) {
    const code = cause instanceof ConvexError && typeof cause.data === 'object' && cause.data ? (cause.data as { code?: string; message?: string }) : null;
    if (code?.code === 'METADATA_CONFLICT') return json({ error: 'Metadata changed since your read; read it again and retry' }, { status: 409 });
    if (code?.code === 'INVALID_VERSION_METADATA') return json({ error: code.message ?? 'Invalid creative metadata' }, { status: 400 });
    if (code?.code === 'IMAGE_REFERENCE_UNAVAILABLE') return json({ error: 'A grid or reference image version is unavailable or not a still image in this project' }, { status: 400 });
    if (code?.code === 'VERSION_UNAVAILABLE') return json({ error: 'Version unavailable' }, { status: 404 });
    return automationError(cause);
  }
};
