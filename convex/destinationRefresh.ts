import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { owner } from './personal';
import { randomSecret } from './lib/reviewAccess';

async function authorized(ctx: MutationCtx | QueryCtx, job: Doc<'syncOutbox'>) {
  const profile = await owner(ctx);
  const connection = await ctx.db.get(job.connectionId);
  const project = await ctx.db.get(job.projectId);
  const asset = await ctx.db.get(job.assetId);
  const version = await ctx.db.get(job.versionId);
  const grant = await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', 'trailer-feed').eq('versionId', job.versionId)).unique();
  if (!connection || connection.createdBy !== profile._id || !project || project.createdBy !== profile._id || project.archived || !asset || asset.projectId !== project._id || asset.status === 'archived' || !version || version.assetId !== asset._id || version.processingState !== 'ready' || job.state !== 'synced' || !grant || grant.createdBy !== profile._id || grant.consentGeneration !== job.consentGeneration || grant.revokedAt !== undefined || (grant.expiresAt !== undefined && grant.expiresAt <= Date.now())) throw new ConvexError({ code: 'SYNC_REFRESH_UNAVAILABLE' });
  return { connection, project, version, grant };
}
async function readyImages(ctx: MutationCtx | QueryCtx, projectId: Id<'projects'>, ids: Id<'assetVersions'>[]) {
  for (const id of ids) {
    const version = await ctx.db.get(id);
    const asset = version && await ctx.db.get(version.assetId);
    if (!version || version.processingState !== 'ready' || !version.mimeType.startsWith('image/') || !asset || asset.assetClass === 'VID' || asset.projectId !== projectId || asset.status === 'archived') throw new ConvexError({ code: 'GRANT_REFERENCE_UNAVAILABLE' });
  }
}
export const confirm = internalMutation({
  args: { jobId: v.id('syncOutbox'), operationId: v.string(), expectedGeneration: v.number(), expectedMetadataUpdatedAt: v.union(v.number(), v.null()) },
  handler: async (ctx, args) => {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(args.operationId)) throw new ConvexError({ code: 'SYNC_SELECTION_INVALID' });
    const job = await ctx.db.get(args.jobId);
    if (!job || job.consentGeneration !== args.expectedGeneration) throw new ConvexError({ code: 'SYNC_REFRESH_UNAVAILABLE' });
    const { version, grant } = await authorized(ctx, job);
    const fingerprint = JSON.stringify(args);
    const existing = await ctx.db.query('destinationRefreshes').withIndex('by_operation', q => q.eq('operationId', args.operationId)).unique();
    if (existing) {
      if (existing.requestFingerprint !== fingerprint) throw new ConvexError({ code: 'SYNC_CONFIRMATION_CHANGED' });
      return { refreshId: existing._id };
    }
    if ((version.metadataUpdatedAt ?? null) !== args.expectedMetadataUpdatedAt) throw new ConvexError({ code: 'SYNC_SELECTION_CHANGED' });
    const metadata = version.creativeMetadata ?? { sourceLabel: '', model: '', prompt: '', referenceImageVersionIds: [] };
    const images = [...new Set([...(metadata.gridImageVersionId ? [metadata.gridImageVersionId] : []), ...metadata.referenceImageVersionIds])];
    await readyImages(ctx, job.projectId, images);
    const newIds = images.filter(id => !grant.referenceVersionIds.includes(id));
    let auxiliary = await ctx.db.query('publicationReferenceGrants').withIndex('by_root_generation', q => q.eq('rootGrantId', grant._id).eq('consentGeneration', grant.consentGeneration)).unique();
    if (newIds.length) {
      const allowed = [...new Set([...(auxiliary?.referenceVersionIds ?? []), ...newIds])];
      if (allowed.length > 21) throw new ConvexError({ code: 'GRANT_TOO_MANY_REFERENCES' });
      if (auxiliary) await ctx.db.patch(auxiliary._id, { referenceVersionIds: allowed });
      else {
        const id = await ctx.db.insert('publicationReferenceGrants', { rootGrantId: grant._id, projectId: job.projectId, consentGeneration: grant.consentGeneration, slug: randomSecret(), referenceVersionIds: allowed, createdAt: Date.now() });
        auxiliary = await ctx.db.get(id);
      }
    }
    const imageUrl = (id: Id<'assetVersions'>) => `https://review.v1su4.dev/api/destination-media/${grant.referenceVersionIds.includes(id) ? grant.slug : auxiliary!.slug}/${id}/original`;
    const original = JSON.parse(job.payloadJson);
    const payloadJson = JSON.stringify({ operation_id: args.operationId, intent: 'refresh-empty', run_id: original.run_id, source_asset_id: original.source_asset_id, source_version_id: original.source_version_id, source_created_at: original.source_created_at, consent_generation: job.consentGeneration, media_url: original.media_url, metadata,
      ...(metadata.gridImageVersionId ? { grid: { source_version_id: metadata.gridImageVersionId, media_url: imageUrl(metadata.gridImageVersionId) } } : {}),
      references: metadata.referenceImageVersionIds.map(id => ({ source_version_id: id, media_url: imageUrl(id) })) });
    if (new TextEncoder().encode(payloadJson).byteLength > 800000) throw new ConvexError({ code: 'SYNC_BATCH_TOO_LARGE' });
    const refreshId = await ctx.db.insert('destinationRefreshes', { operationId: args.operationId, requestFingerprint: fingerprint, jobId: job._id, projectId: job.projectId, consentGeneration: job.consentGeneration, payloadJson, referenceVersionIds: images, state: 'queued', attempts: 0, createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.destinationDelivery.refreshMetadata, { refreshId });
    return { refreshId };
  },
});
export const claim = internalMutation({
  args: { refreshId: v.id('destinationRefreshes') },
  handler: async (ctx, { refreshId }): Promise<{ token: string; payloadJson: string; targetArtifactId: string; targetVersionNumber: number } | null> => {
    const operation = await ctx.db.get(refreshId);
    if (!operation || !['queued', 'sending'].includes(operation.state) || (operation.leaseUntil ?? 0) > Date.now()) return null;
    const job = await ctx.db.get(operation.jobId);
    try {
      if (!job || job.consentGeneration !== operation.consentGeneration || !job.targetArtifactId || !job.targetVersionNumber) throw new Error();
      await authorized(ctx, job);
      await readyImages(ctx, operation.projectId, operation.referenceVersionIds);
    } catch {
      await ctx.db.patch(refreshId, { state: 'disconnected', attemptToken: undefined, leaseUntil: undefined, lastError: 'Refresh consent is no longer valid', updatedAt: Date.now() });
      return null;
    }
    const token = randomSecret();
    await ctx.db.patch(refreshId, { state: 'sending', attemptToken: token, leaseUntil: Date.now() + 30000, attempts: operation.attempts + 1, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(31000, internal.destinationDelivery.refreshMetadata, { refreshId });
    return { token, payloadJson: operation.payloadJson, targetArtifactId: job!.targetArtifactId!, targetVersionNumber: job!.targetVersionNumber! };
  },
});
export const finish = internalMutation({
  args: { refreshId: v.id('destinationRefreshes'), token: v.string(), ok: v.boolean(), disconnected: v.optional(v.boolean()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.refreshId);
    if (!operation || operation.state !== 'sending' || operation.attemptToken !== args.token) return;
    let valid = true;
    try { const job = await ctx.db.get(operation.jobId); if (!job || job.consentGeneration !== operation.consentGeneration) throw new Error(); await authorized(ctx, job); await readyImages(ctx, operation.projectId, operation.referenceVersionIds); } catch { valid = false; }
    await ctx.db.patch(operation._id, { state: !valid || args.disconnected ? 'disconnected' : args.ok ? 'complete' : 'failed', attemptToken: undefined, leaseUntil: undefined, lastError: !valid ? 'Refresh consent changed during delivery' : args.ok ? undefined : args.error ?? 'Refresh failed; retry the saved operation', updatedAt: Date.now() });
  },
});
export const retry = internalMutation({
  args: { refreshId: v.id('destinationRefreshes') },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.refreshId);
    const job = operation && await ctx.db.get(operation.jobId);
    if (!operation || !job) throw new ConvexError({ code: 'SYNC_REFRESH_UNAVAILABLE' });
    await authorized(ctx, job);
    if (operation.state !== 'failed') return;
    await ctx.db.patch(operation._id, { state: 'queued', lastError: undefined, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.destinationDelivery.refreshMetadata, args);
  },
});
export const snapshot = internalQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const profile = await owner(ctx); const project = await ctx.db.get(projectId);
    if (!project || project.createdBy !== profile._id || project.archived) throw new ConvexError({ code: 'SYNC_PROJECT_UNAVAILABLE' });
    const rows = await ctx.db.query('destinationRefreshes').withIndex('by_project', q => q.eq('projectId', projectId)).collect();
    return rows.map(({ _id, jobId, operationId, state, attempts, lastError }) => ({ id: _id, jobId, operationId, state, attempts, lastError }));
  },
});
