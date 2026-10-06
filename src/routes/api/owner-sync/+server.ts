import { json, error } from '@sveltejs/kit';
import { ConvexError } from 'convex/values';
import type { RequestHandler } from './$types';
import { internal } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db } from '$lib/server/personal';

function syncError(cause: unknown): Response | never {
  const data = cause instanceof ConvexError ? cause.data : null;
  const code = data && typeof data === 'object' && 'code' in data ? data.code : null;
  if (code === 'SYNC_TARGET_CONFLICT') return json({ message: 'A target with this name already exists. Choose it or change the name.', existingRunId: data && typeof data === 'object' && 'existingRunId' in data ? data.existingRunId : undefined }, { status: 409, headers: { 'cache-control': 'private, no-store' } });
  if (code === 'SYNC_PROJECT_UNAVAILABLE' || code === 'SYNC_FOLDER_UNAVAILABLE' || code === 'SYNC_CONNECTION_UNAVAILABLE' || code === 'SYNC_BATCH_UNAVAILABLE' || code === 'SYNC_VERSION_UNAVAILABLE') throw error(404, 'Selected source or connection is unavailable');
  if (code === 'SYNC_SELECTION_CHANGED' || code === 'SYNC_CONFIRMATION_CHANGED' || code === 'SYNC_CONNECTION_CHANGED' || code === 'SYNC_REACTIVATION_UNAVAILABLE') throw error(409, 'Selection or destination consent changed. Reload and confirm the exact version again.');
  if (code === 'SYNC_VERSION_ALREADY_SELECTED') throw error(409, 'This version already has a saved sync operation. Retry its failed delivery or use Sync again after disconnection.');
  if (code === 'GRANT_MEDIA_NOT_READY' || code === 'GRANT_REFERENCE_UNAVAILABLE') throw error(409, 'Wait for selected media and images to finish processing; check missing references.');
  if (code === 'SYNC_CONNECTION_FAILED') throw error(502, data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : 'Destination connection failed');
  if (typeof code === 'string' && (code.startsWith('SYNC_') || code.startsWith('GRANT_'))) throw error(400, 'Check the exact selection, target and batch size before confirming');
  throw cause;
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  requireOwner(cookies);
  const projectId = url.searchParams.get('projectId');
  const folderId = url.searchParams.get('folderId') || undefined;
  if (!projectId || projectId.length > 128 || (folderId && folderId.length > 128)) throw error(400, 'Project required');
  try {
    const workspace = await db().query(internal.destinationSync.workspace, { projectId, folderId });
    const reconciliation = await db().action(internal.destinationDelivery.reconcile, { projectId });
    const snapshot = await db().query(internal.destinationSync.snapshot, { projectId: projectId as Id<'projects'> });
    return json({ ...workspace, ...snapshot, ...(reconciliation.ok ? {} : { reconciliationError: reconciliation.error }) }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) { return syncError(cause); }
};

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw error(400, 'Sync operation required');
  try {
    if (body.action === 'connect') {
      if (typeof body.projectId !== 'string' || (body.folderId !== undefined && typeof body.folderId !== 'string') || !['create', 'connect'].includes(body.mode) || (body.targetTitle !== undefined && typeof body.targetTitle !== 'string') || (body.targetRunId !== undefined && typeof body.targetRunId !== 'string')) throw error(400, 'Explicit target connection required');
      return json(await db().action(internal.destinationDelivery.connect, { destinationKey: 'trailer-feed', projectId: body.projectId, folderId: body.folderId,
        mode: body.mode, targetTitle: body.targetTitle, targetRunId: body.targetRunId }), { headers: { 'cache-control': 'private, no-store' } });
    }
    if (body.action === 'confirm') {
      if (typeof body.connectionId !== 'string' || typeof body.confirmationId !== 'string' || !Array.isArray(body.versions) || !body.versions.length || body.versions.length > 100 || body.versions.some((item: { versionId?: unknown; expectedMetadataUpdatedAt?: unknown }) => !item || typeof item.versionId !== 'string' || (item.expectedMetadataUpdatedAt !== null && (!Number.isSafeInteger(item.expectedMetadataUpdatedAt) || Number(item.expectedMetadataUpdatedAt) < 0)))) throw error(400, 'Exact versions and their metadata revisions required');
      return json(await db().mutation(internal.destinationSync.confirm, { connectionId: body.connectionId, confirmationId: body.confirmationId, versions: body.versions.map((item: { versionId: string; expectedMetadataUpdatedAt: number | null }) => ({ versionId: item.versionId, expectedMetadataUpdatedAt: item.expectedMetadataUpdatedAt })) }), { headers: { 'cache-control': 'private, no-store' } });
    }
    if (body.action === 'retry' && typeof body.batchId === 'string') {
      await db().mutation(internal.destinationSync.retry, { batchId: body.batchId });
      return json({ ok: true }, { headers: { 'cache-control': 'private, no-store' } });
    }
    if (body.action === 'sync-again') {
      if (typeof body.connectionId !== 'string' || typeof body.confirmationId !== 'string' || typeof body.versionId !== 'string' || !Number.isSafeInteger(body.expectedGeneration) || body.expectedGeneration < 1 || (body.expectedMetadataUpdatedAt !== null && (!Number.isSafeInteger(body.expectedMetadataUpdatedAt) || body.expectedMetadataUpdatedAt < 0))) throw error(400, 'Exact version, current consent and metadata revision required');
      return json(await db().mutation(internal.destinationSync.syncAgain, { connectionId: body.connectionId, confirmationId: body.confirmationId, versionId: body.versionId, expectedGeneration: body.expectedGeneration, expectedMetadataUpdatedAt: body.expectedMetadataUpdatedAt }), { headers: { 'cache-control': 'private, no-store' } });
    }
    throw error(400, 'Supported sync operation required');
  } catch (cause) { return syncError(cause); }
};
