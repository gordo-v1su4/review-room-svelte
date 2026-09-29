import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../convex/_generated/api';
import { db, posterKey, stagingKey, uploadUrl } from '$lib/server/personal';
import { automationError, automationRequest } from '$lib/server/automation-http';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    if (typeof body?.projectId !== 'string' || typeof body.name !== 'string' ||
      typeof body.type !== 'string' || !Number.isSafeInteger(body.size) ||
      (body.folderId !== undefined && typeof body.folderId !== 'string') ||
      (body.assetId !== undefined && typeof body.assetId !== 'string')) {
      return json({ error: 'Provide projectId, name, type and integer size' }, { status: 400 });
    }
    const input = { projectId: body.projectId as Id<'projects'>,
      folderId: body.folderId as Id<'projectFolders'> | undefined,
      assetId: body.assetId as Id<'videos'> | undefined,
      originalFilename: body.name, mimeType: body.type, sizeBytes: body.size };
    const auth = automationRequest(event, input);
    const session = await db().mutation(internal.automation.beginUpload, { ...auth, ...input });
    const url = await uploadUrl(stagingKey(session.objectKey), body.type);
    const posterUrl = await uploadUrl(stagingKey(posterKey(session.objectKey)), 'image/jpeg');
    return json({ sessionId: session.sessionId, url, posterUrl, expiresAt: session.expiresAt },
      { status: 201, headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) { return automationError(cause); }
};
