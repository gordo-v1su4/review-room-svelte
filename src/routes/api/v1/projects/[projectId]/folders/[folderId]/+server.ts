import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationError, automationRequest } from '$lib/server/automation-http';

export const PATCH: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    if (body?.title !== undefined && typeof body.title !== 'string') return json({ error: 'Folder title must be a string' }, { status: 400 });
    if (body?.parentFolderId !== undefined && body.parentFolderId !== null && (typeof body.parentFolderId !== 'string' || !body.parentFolderId.trim())) return json({ error: 'Parent folder ID must be a nonempty string or null' }, { status: 400 });
    if (body?.ownerApp !== undefined && body.ownerApp !== 'creative-studio-pro') return json({ error: 'Unsupported folder owner app' }, { status: 400 });
    if (body?.ownerApp !== undefined && (body.title !== undefined || body.parentFolderId !== undefined)) return json({ error: 'Folder adoption must be a separate request' }, { status: 400 });
    if (body?.title === undefined && body?.parentFolderId === undefined && body?.ownerApp === undefined) return json({ error: 'Folder title, parent folder, or owner app must be provided' }, { status: 400 });
    // Unchanged body shape for rename-only calls keeps existing idempotency digests stable.
    const auth = automationRequest(event, { projectId: event.params.projectId, folderId: event.params.folderId,
      ...(body.title !== undefined ? { title: body.title } : {}), ...(body.parentFolderId !== undefined ? { parentFolderId: body.parentFolderId } : {}),
      ...(body.ownerApp !== undefined ? { ownerApp: body.ownerApp } : {}) });
    const folderId = await db().mutation(internal.automation.editFolder,
      { ...auth, projectId: event.params.projectId as Id<'projects'>, folderId: event.params.folderId as Id<'projectFolders'>,
        ...(body.title !== undefined ? { title: body.title as string } : {}),
        ...(body.parentFolderId !== undefined ? { parentFolderId: body.parentFolderId as Id<'projectFolders'> | null } : {}),
        ...(body.ownerApp !== undefined ? { ownerApp: body.ownerApp as 'creative-studio-pro' } : {}) });
    return json({ folderId }, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return automationError(cause); }
};

export const DELETE: RequestHandler = async (event) => {
  try {
    const assetDisposition = event.url.searchParams.get('assets') ?? 'move_to_root';
    if (assetDisposition !== 'move_to_root' && assetDisposition !== 'archive_assets') return json({ error: 'assets must be move_to_root or archive_assets' }, { status: 400 });
    const auth = automationRequest(event, { projectId: event.params.projectId, folderId: event.params.folderId, assetDisposition });
    const result = await db().mutation(internal.automation.deleteFolder,
      { ...auth, projectId: event.params.projectId as Id<'projects'>, folderId: event.params.folderId as Id<'projectFolders'>, assetDisposition });
    return json({ folderId: event.params.folderId, ...result }, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return automationError(cause); }
};
