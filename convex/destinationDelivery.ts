"use node";
import { v, ConvexError } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

class DestinationFailure extends Error {
  constructor(message: string, readonly disconnected = false) { super(message); }
}

async function post(path: 'batches' | 'versions' | 'connections' | 'status' | 'reactivations', payload: Record<string, unknown>) {
  const key = process.env.TRAILER_FEED_REVIEW_INGEST_KEY;
  if (!key) throw new DestinationFailure('Destination delivery is not configured');
  const response = await fetch(`https://media.v1su4.dev/trailer-feed/external/review/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload), redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    if (path === 'connections' && response.status === 409) {
      const body = await response.json().catch(() => ({}));
      throw new ConvexError({ code: 'SYNC_TARGET_CONFLICT', message: 'Choose the existing target project or a different name',
        ...(typeof body.existing_run_id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(body.existing_run_id) ? { existingRunId: body.existing_run_id } : {}) });
    }
    if (response.status === 404 || response.status === 409) throw new DestinationFailure('Target removed or consent changed; confirm Sync again for this exact version', true);
    if (response.status === 401 || response.status === 403) throw new DestinationFailure('Destination authorization failed');
    throw new DestinationFailure(`Destination delivery failed (${response.status}); retry this operation`);
  }
  return await response.json();
}

function failure(cause: unknown) {
  return { error: cause instanceof DestinationFailure ? cause.message : 'Destination request failed; retry this operation', disconnected: cause instanceof DestinationFailure && cause.disconnected };
}

export const connect = internalAction({
  args: { destinationKey: v.literal('trailer-feed'), projectId: v.string(), folderId: v.optional(v.string()), mode: v.union(v.literal('create'), v.literal('connect')), targetTitle: v.optional(v.string()), targetRunId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ connectionId: Id<'destinationConnections'>; targetRunId: string }> => {
    const source = await ctx.runQuery(internal.destinationSync.prepareConnection, { projectId: args.projectId, folderId: args.folderId });
    const title = args.targetTitle ?? source.title;
    if ((args.mode === 'create' && (!title.trim() || title.trim().length > 120)) || (args.mode === 'connect' && (!args.targetRunId || !/^[A-Za-z0-9_-]{1,128}$/.test(args.targetRunId)))) throw new ConvexError({ code: 'SYNC_TARGET_INVALID' });
    try {
      const result = await post('connections', { source_project_id: source.projectId, source_folder_id: source.folderId ?? '__root__', mode: args.mode,
        ...(args.mode === 'create' ? { title: title.trim() } : { run_id: args.targetRunId }) });
      if (result.source_project_id !== source.projectId || result.source_folder_id !== (source.folderId ?? '__root__') || typeof result.run_id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(result.run_id) || (args.mode === 'connect' && result.run_id !== args.targetRunId)) throw new DestinationFailure('Destination did not acknowledge the selected source connection');
      const connectionId = await ctx.runMutation(internal.destinationSync.saveConnection, { destinationKey: args.destinationKey, projectId: source.projectId, folderId: source.folderId, targetRunId: result.run_id });
      return { connectionId, targetRunId: result.run_id };
    } catch (cause) {
      if (cause instanceof ConvexError) throw cause;
      throw new ConvexError({ code: 'SYNC_CONNECTION_FAILED', message: failure(cause).error });
    }
  },
});

export const reserve = internalAction({
  args: { batchId: v.id('syncBatches') },
  handler: async (ctx, args): Promise<void> => {
    const claim = await ctx.runMutation(internal.destinationSync.claimBatch, args);
    if (!claim) return;
    try {
      if (claim.reactivationJson) {
        const consent = JSON.parse(claim.reactivationJson);
        const acknowledgement = await post('reactivations', consent);
        if (acknowledgement.batch_id !== consent.batch_id || acknowledgement.consent_generation !== consent.consent_generation || !Number.isSafeInteger(acknowledgement.version_number) || acknowledgement.version_number < 1) throw new DestinationFailure('Destination did not acknowledge the exact reactivation consent');
      }
      const payload = JSON.parse(claim.reservationJson);
      const result = await post('batches', payload);
      if (result.batch_id !== payload.batch_id || !Array.isArray(result.versions) || result.versions.length !== payload.versions.length || payload.versions.some((item: Record<string, unknown>) => result.versions.filter((target: Record<string, unknown>) => target.source_asset_id === item.source_asset_id && target.source_version_id === item.source_version_id && target.consent_generation === item.consent_generation).length !== 1)) throw new DestinationFailure('Destination reservation response did not match the selected batch');
      await ctx.runMutation(internal.destinationSync.finishReservation, { ...args, token: claim.token, ok: true });
    } catch (cause) {
      await ctx.runMutation(internal.destinationSync.finishReservation, { ...args, token: claim.token, ok: false, ...failure(cause) });
    }
  },
});

export const item = internalAction({
  args: { jobId: v.id('syncOutbox') },
  handler: async (ctx, args): Promise<void> => {
    const claim = await ctx.runMutation(internal.destinationSync.claimItem, args);
    if (!claim) return;
    try {
      const payload = JSON.parse(claim.payloadJson);
      const result = await post('versions', payload);
      const artifact = result.artifact;
      if (!artifact || artifact.source_app !== 'review-room' || artifact.source_asset_id !== payload.source_asset_id || artifact.source_version_id !== payload.source_version_id || artifact.consent_generation !== payload.consent_generation || typeof artifact.artifact_id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(artifact.artifact_id) || !Number.isSafeInteger(artifact.version_number) || artifact.version_number < 1) throw new DestinationFailure('Destination response did not acknowledge this exact source version');
      await ctx.runMutation(internal.destinationSync.finishItem, { ...args, token: claim.token, ok: true, targetArtifactId: artifact.artifact_id, targetVersionNumber: artifact.version_number });
    } catch (cause) {
      await ctx.runMutation(internal.destinationSync.finishItem, { ...args, token: claim.token, ok: false, ...failure(cause) });
    }
  },
});

export const reconcile = internalAction({
  args: { projectId: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const jobs = await ctx.runQuery(internal.destinationSync.prepareReconciliation, args);
    try {
      for (let offset = 0; offset < jobs.length; offset += 100) {
        const page = jobs.slice(offset, offset + 100);
        const result = await post('status', { versions: page.map(job => ({ source_asset_id: job.assetId, source_version_id: job.versionId })) });
        if (!Array.isArray(result.versions) || result.versions.length !== page.length) throw new DestinationFailure('Destination status did not match the requested versions');
        const acknowledgements = page.map(job => {
          const matches = result.versions.filter((item: Record<string, unknown>) => item.source_asset_id === job.assetId && item.source_version_id === job.versionId);
          const target = matches[0];
          if (matches.length !== 1 || !['registered', 'reserved', 'target_suppressed', 'source_deleted', 'unregistered'].includes(target.state) || (target.state !== 'unregistered' && (!Number.isSafeInteger(target.consent_generation) || target.consent_generation < 1 || typeof target.run_id !== 'string' || typeof target.artifact_id !== 'string' || !Number.isSafeInteger(target.version_number) || target.version_number < 1))) throw new DestinationFailure('Destination status did not acknowledge an exact source version');
          return { jobId: job.jobId, expectedGeneration: job.consentGeneration, state: target.state,
            ...(target.state === 'unregistered' ? {} : { consentGeneration: target.consent_generation, targetRunId: target.run_id, targetArtifactId: target.artifact_id, targetVersionNumber: target.version_number }) };
        });
        await ctx.runMutation(internal.destinationSync.applyReconciliation, { results: acknowledgements });
      }
      return { ok: true };
    } catch (cause) { return { ok: false, error: failure(cause).error }; }
  },
});
