import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { owner } from './personal';
import { randomSecret } from './lib/reviewAccess';

export const confirm = internalMutation({
  args: { jobId: v.id('syncOutbox'), expectedGeneration: v.number() },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    const job = await ctx.db.get(args.jobId);
    const project = job && await ctx.db.get(job.projectId);
    const connection = job && await ctx.db.get(job.connectionId);
    if (!job || !project || project.createdBy !== profile._id || project.archived || !connection || connection.createdBy !== profile._id || job.consentGeneration !== args.expectedGeneration || job.state === 'source_deleted') throw new ConvexError({ code: 'SYNC_UNSYNC_UNAVAILABLE' });
    const existing = await ctx.db.query('destinationUnsyncs').withIndex('by_job', q => q.eq('jobId', job._id)).unique();
    if (existing) return { unsyncId: existing._id };
    const history = await ctx.db.query('syncOutbox').withIndex('by_source_version', q => q.eq('connectionId', job.connectionId).eq('versionId', job.versionId)).collect();
    if (history.some(item => item.consentGeneration > job.consentGeneration)) throw new ConvexError({ code: 'SYNC_SELECTION_CHANGED' });
    const grant = await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', 'trailer-feed').eq('versionId', job.versionId)).unique();
    if (!grant || grant.createdBy !== profile._id || grant.consentGeneration !== job.consentGeneration) throw new ConvexError({ code: 'SYNC_UNSYNC_UNAVAILABLE' });
    await ctx.db.patch(grant._id, { revokedAt: Date.now() });
    await ctx.db.patch(job._id, { state: 'disconnected', targetState: 'unsync_pending', targetConsentGeneration: undefined, attemptToken: undefined, leaseUntil: undefined, lastError: 'Unsync saved; target suppression pending', updatedAt: Date.now() });
    const batch = await ctx.db.get(job.batchId);
    if (batch && (batch.state === 'queued' || batch.state === 'failed')) {
      const jobs = await ctx.db.query('syncOutbox').withIndex('by_batch', q => q.eq('batchId', batch._id)).collect();
      const remaining = jobs.filter(item => item._id !== job._id && (item.state === 'queued' || item.state === 'failed'));
      if (remaining.length) {
        const nonce = randomSecret();
        const reservation = JSON.parse(batch.reservationJson);
        const ids = new Set<string>(remaining.map(item => item.versionId));
        reservation.batch_id = nonce; reservation.versions = reservation.versions.filter((item: { source_version_id: string }) => ids.has(item.source_version_id));
        const saved = batch.reactivationJson ? JSON.parse(batch.reactivationJson) : [];
        const preparation = (Array.isArray(saved) ? saved : [saved]).filter(intent => ids.has(intent.intent === 'reserve-fresh' ? intent.versions[0].source_version_id : intent.source_version_id)).map(intent => intent.intent === 'reserve-fresh' ? { ...intent, batch_id: randomSecret() } : intent);
        for (const item of remaining) { const payload = JSON.parse(item.payloadJson); payload.batch_id = nonce; await ctx.db.patch(item._id, { payloadJson: JSON.stringify(payload), state: 'queued', attemptToken: undefined, leaseUntil: undefined, lastError: undefined, updatedAt: Date.now() }); }
        await ctx.db.patch(batch._id, { reservationJson: JSON.stringify(reservation), reactivationJson: preparation.length ? JSON.stringify(preparation) : undefined, preparationIndex: 0, state: 'queued', attemptToken: undefined, leaseUntil: undefined, lastError: undefined, updatedAt: Date.now() });
        await ctx.scheduler.runAfter(0, internal.destinationDelivery.reserve, { batchId: batch._id });
      } else await ctx.db.patch(batch._id, { state: 'complete', attemptToken: undefined, leaseUntil: undefined, updatedAt: Date.now() });
    }
    const unsyncId = await ctx.db.insert('destinationUnsyncs', { jobId: job._id, projectId: job.projectId, sourceAssetId: job.assetId, sourceVersionId: job.versionId, consentGeneration: job.consentGeneration, state: 'queued', attempts: 0, nextAttemptAt: Date.now(), createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.destinationDelivery.unsyncVersion, { unsyncId });
    return { unsyncId };
  },
});
export const claim = internalMutation({
  args: { unsyncId: v.id('destinationUnsyncs') },
  handler: async (ctx, { unsyncId }): Promise<{ token: string; payload: { source_asset_id: string; source_version_id: string; consent_generation: number } } | null> => {
    const operation = await ctx.db.get(unsyncId);
    if (!operation || operation.state === 'complete' || operation.nextAttemptAt > Date.now() || (operation.leaseUntil ?? 0) > Date.now()) return null;
    const id = ctx.db.normalizeId('assetVersions', operation.sourceVersionId);
    const grant = id && await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', 'trailer-feed').eq('versionId', id)).unique();
    // Fresh publication is allowed only after authoritative suppression; older removal must never touch it.
    if (grant && grant.consentGeneration > operation.consentGeneration) {
      await ctx.db.patch(unsyncId, { state: 'complete', attemptToken: undefined, leaseUntil: undefined, lastError: undefined, updatedAt: Date.now() });
      return null;
    }
    const token = randomSecret();
    await ctx.db.patch(unsyncId, { state: 'sending', attemptToken: token, leaseUntil: Date.now() + 30000, attempts: operation.attempts + 1, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(31000, internal.destinationDelivery.unsyncVersion, { unsyncId });
    return { token, payload: { source_asset_id: operation.sourceAssetId, source_version_id: operation.sourceVersionId, consent_generation: operation.consentGeneration } };
  },
});
export const finish = internalMutation({
  args: { unsyncId: v.id('destinationUnsyncs'), token: v.string(), ok: v.boolean(), error: v.optional(v.string()), terminal: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.unsyncId);
    if (!operation || operation.state !== 'sending' || operation.attemptToken !== args.token) return;
    const delay = Math.min(3600000, 30000 * 2 ** Math.min(operation.attempts - 1, 7));
    await ctx.db.patch(operation._id, { state: args.ok ? 'complete' : 'queued', attemptToken: undefined, leaseUntil: undefined, nextAttemptAt: Date.now() + (args.ok ? 0 : delay), lastError: args.ok ? undefined : args.error ?? 'Unsync will retry', updatedAt: Date.now() });
    if (args.ok) {
      const job = await ctx.db.get(operation.jobId);
      if (job && job.consentGeneration === operation.consentGeneration && job.state === 'disconnected' && job.targetState === 'unsync_pending') await ctx.db.patch(job._id, { targetState: args.terminal ? 'source_deleted' : 'target_suppressed', targetConsentGeneration: operation.consentGeneration, lastError: args.terminal ? 'Source was deleted' : 'Unsynced; fresh exact-version consent is required to publish again', updatedAt: Date.now() });
    } else await ctx.scheduler.runAfter(delay, internal.destinationDelivery.unsyncVersion, { unsyncId: operation._id });
  },
});
export const snapshot = internalQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const profile = await owner(ctx); const project = await ctx.db.get(projectId);
    if (!project || project.createdBy !== profile._id || project.archived) throw new ConvexError({ code: 'SYNC_PROJECT_UNAVAILABLE' });
    const rows = await ctx.db.query('destinationUnsyncs').withIndex('by_project', q => q.eq('projectId', projectId)).collect();
    return rows.map(({ _id, jobId, state, attempts, lastError }) => ({ id: _id, jobId, state, attempts, lastError }));
  },
});

