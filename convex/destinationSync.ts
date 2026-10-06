import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { owner } from './personal';
import { issueGrant } from './publicationGrants';
import { randomSecret } from './lib/reviewAccess';
import { internal } from './_generated/api';

async function ownedProject(ctx: MutationCtx | QueryCtx, projectId: Id<'projects'>) {
  const profile = await owner(ctx);
  const project = await ctx.db.get(projectId);
  if (!project || project.createdBy !== profile._id || project.archived) throw new ConvexError({ code: 'SYNC_PROJECT_UNAVAILABLE' });
  return { profile, project };
}

/** The server persists a verified target connection; ordinary upload never calls this module. */
export const saveConnection = internalMutation({
  args: { destinationKey: v.literal('trailer-feed'), projectId: v.id('projects'), folderId: v.optional(v.id('projectFolders')), targetRunId: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await ownedProject(ctx, args.projectId);
    const folder = args.folderId && await ctx.db.get(args.folderId);
    if (args.folderId && (!folder || folder.projectId !== args.projectId)) throw new ConvexError({ code: 'SYNC_FOLDER_UNAVAILABLE' });
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(args.targetRunId)) throw new ConvexError({ code: 'SYNC_TARGET_INVALID' });
    const existing = await ctx.db.query('destinationConnections').withIndex('by_source_folder', q => q.eq('destinationKey', args.destinationKey).eq('projectId', args.projectId).eq('folderId', args.folderId)).unique();
    if (existing) {
      if (existing.targetRunId !== args.targetRunId) throw new ConvexError({ code: 'SYNC_CONNECTION_CHANGED' });
      return existing._id;
    }
    return await ctx.db.insert('destinationConnections', { ...args, createdBy: profile._id, createdAt: Date.now(), updatedAt: Date.now() });
  },
});

export const prepareConnection = internalQuery({
  args: { projectId: v.string(), folderId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId('projects', args.projectId);
    const folderId = args.folderId ? ctx.db.normalizeId('projectFolders', args.folderId) : undefined;
    if (!projectId || (args.folderId && !folderId)) throw new ConvexError({ code: 'SYNC_PROJECT_UNAVAILABLE' });
    const { project } = await ownedProject(ctx, projectId);
    const folder = folderId && await ctx.db.get(folderId);
    if (args.folderId && (!folder || folder.projectId !== project._id)) throw new ConvexError({ code: 'SYNC_FOLDER_UNAVAILABLE' });
    return { projectId: project._id, folderId: folderId ?? undefined, title: folder ? folder.title : project.title };
  },
});

export const workspace = internalQuery({
  args: { projectId: v.string(), folderId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId('projects', args.projectId);
    const folderId = args.folderId ? ctx.db.normalizeId('projectFolders', args.folderId) : undefined;
    if (!projectId || (args.folderId && !folderId)) throw new ConvexError({ code: 'SYNC_PROJECT_UNAVAILABLE' });
    const { project } = await ownedProject(ctx, projectId);
    const folders = await ctx.db.query('projectFolders').withIndex('by_project', q => q.eq('projectId', projectId)).collect();
    if (folderId && !folders.some(folder => folder._id === folderId)) throw new ConvexError({ code: 'SYNC_FOLDER_UNAVAILABLE' });
    const assets = await ctx.db.query('videos').withIndex('by_project', q => q.eq('projectId', projectId)).collect();
    const options = [];
    for (const asset of assets) {
      if (asset.status === 'archived' || (folderId && asset.folderId !== folderId)) continue;
      const versions = await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', asset._id)).collect();
      for (const version of versions) {
        if (!version.mimeType.startsWith('video/')) continue;
        const metadata = version.creativeMetadata;
        const imageIds = [...new Set([...(metadata?.gridImageVersionId ? [metadata.gridImageVersionId] : []), ...(metadata?.referenceImageVersionIds ?? [])])];
        const images = [];
        for (const id of imageIds) {
          const imageVersion = await ctx.db.get(id);
          const image = imageVersion && await ctx.db.get(imageVersion.assetId);
          images.push({ versionId: id, label: image && imageVersion ? `${image.assetCode ?? image.title} · V${imageVersion.version}` : 'Missing image', ready: !!(image && image.projectId === projectId && image.status !== 'archived' && image.assetClass !== 'VID' && imageVersion?.mimeType.startsWith('image/') && imageVersion.processingState === 'ready'), grid: id === metadata?.gridImageVersionId });
        }
        options.push({ versionId: version._id, assetId: asset._id, assetCode: asset.assetCode ?? asset.title, title: asset.title, version: version.version,
          isCurrent: version._id === asset.currentVersionId, expectedMetadataUpdatedAt: version.metadataUpdatedAt ?? null,
          sourceCreatedAt: metadata?.sourceCreatedAt ?? version.createdAt, model: metadata?.model ?? '', sourceLabel: metadata?.sourceLabel ?? '',
          promptPreview: (metadata?.prompt ?? '').slice(0, 140), images, ready: version.processingState === 'ready' && images.every(image => image.ready) });
      }
    }
    options.sort((a, b) => a.sourceCreatedAt - b.sourceCreatedAt || a.versionId.localeCompare(b.versionId));
    return { projectTitle: project.title, folders: folders.map(folder => ({ id: folder._id, title: folder.title })), versions: options };
  },
});

export const snapshot = internalQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await ownedProject(ctx, args.projectId);
    const connections = await ctx.db.query('destinationConnections').withIndex('by_project', q => q.eq('projectId', args.projectId)).collect();
    const batches = await ctx.db.query('syncBatches').withIndex('by_project', q => q.eq('projectId', args.projectId)).collect();
    const jobs = await ctx.db.query('syncOutbox').withIndex('by_project', q => q.eq('projectId', args.projectId)).collect();
    return { connections, batches: batches.map(({ reservationJson: _reservation, requestFingerprint: _fingerprint, attemptToken: _token, leaseUntil: _lease, ...batch }) => batch), items: jobs.map(job => {
      const payload = JSON.parse(job.payloadJson);
      return { id: job._id, batchId: job.batchId, connectionId: job.connectionId, versionId: job.versionId,
        state: job.state, consentGeneration: job.consentGeneration, attempts: job.attempts, lastError: job.lastError,
        model: payload.metadata.model, prompt: payload.metadata.prompt, sourceLabel: payload.metadata.sourceLabel,
        targetArtifactId: job.targetArtifactId, targetVersionNumber: job.targetVersionNumber };
    }) };
  },
});

export const prepareReconciliation = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId('projects', args.projectId);
    if (!projectId) throw new ConvexError({ code: 'SYNC_PROJECT_UNAVAILABLE' });
    await ownedProject(ctx, projectId);
    const jobs = await ctx.db.query('syncOutbox').withIndex('by_project', q => q.eq('projectId', projectId)).collect();
    return jobs.filter(job => job.state === 'synced').map(job => ({ jobId: job._id, assetId: job.assetId, versionId: job.versionId, consentGeneration: job.consentGeneration }));
  },
});

export const applyReconciliation = internalMutation({
  args: { results: v.array(v.object({ jobId: v.id('syncOutbox'), expectedGeneration: v.number(), state: v.union(v.literal('registered'), v.literal('reserved'), v.literal('target_suppressed'), v.literal('source_deleted'), v.literal('unregistered')), consentGeneration: v.optional(v.number()), targetRunId: v.optional(v.string()), targetArtifactId: v.optional(v.string()), targetVersionNumber: v.optional(v.number()) })) },
  handler: async (ctx, args) => {
    for (const result of args.results) {
      const job = await ctx.db.get(result.jobId);
      if (!job || job.state !== 'synced' || job.consentGeneration !== result.expectedGeneration) continue;
      const connection = await ctx.db.get(job.connectionId);
      const matches = result.state === 'registered' && result.consentGeneration === job.consentGeneration && result.targetRunId === connection?.targetRunId && result.targetArtifactId === job.targetArtifactId && result.targetVersionNumber === job.targetVersionNumber;
      if (matches && await stillAuthorized(ctx, job)) continue;
      await ctx.db.patch(job._id, { state: result.state === 'source_deleted' ? 'source_deleted' : 'disconnected', lastError: 'Destination no longer contains this authorized exact version', updatedAt: Date.now() });
    }
  },
});

export const confirm = internalMutation({
  args: { connectionId: v.string(), confirmationId: v.string(), versions: v.array(v.object({ versionId: v.string(), expectedMetadataUpdatedAt: v.union(v.number(), v.null()) })) },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    const connectionId = ctx.db.normalizeId('destinationConnections', args.connectionId);
    const connection = connectionId && await ctx.db.get(connectionId);
    if (!connection || connection.createdBy !== profile._id) throw new ConvexError({ code: 'SYNC_CONNECTION_UNAVAILABLE' });
    await ownedProject(ctx, connection.projectId);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(args.confirmationId) || !args.versions.length || args.versions.length > 100 || new Set(args.versions.map(item => item.versionId)).size !== args.versions.length) throw new ConvexError({ code: 'SYNC_SELECTION_INVALID' });
    const requestFingerprint = JSON.stringify({ connectionId: args.connectionId, versions: [...args.versions].sort((a, b) => a.versionId.localeCompare(b.versionId)) });
    const existing = await ctx.db.query('syncBatches').withIndex('by_confirmation', q => q.eq('confirmationId', args.confirmationId)).unique();
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) throw new ConvexError({ code: 'SYNC_CONFIRMATION_CHANGED' });
      return { batchId: existing._id };
    }
    const selected = [];
    for (const item of args.versions) {
      const id = ctx.db.normalizeId('assetVersions', item.versionId);
      const version = id && await ctx.db.get(id);
      const asset = version && await ctx.db.get(version.assetId);
      if (!version || !asset || asset.projectId !== connection.projectId || (connection.folderId && asset.folderId !== connection.folderId) || !version.mimeType.startsWith('video/')) throw new ConvexError({ code: 'SYNC_VERSION_UNAVAILABLE' });
      if ((version.metadataUpdatedAt ?? null) !== item.expectedMetadataUpdatedAt) throw new ConvexError({ code: 'SYNC_SELECTION_CHANGED' });
      const previous = await ctx.db.query('syncOutbox').withIndex('by_source_version', q => q.eq('connectionId', connection._id).eq('versionId', version._id)).first();
      if (previous) throw new ConvexError({ code: 'SYNC_VERSION_ALREADY_SELECTED' });
      selected.push({ version, asset, sourceCreatedAt: version.creativeMetadata?.sourceCreatedAt ?? version.createdAt });
    }
    selected.sort((a, b) => a.sourceCreatedAt - b.sourceCreatedAt || a.version._id.localeCompare(b.version._id));
    const jobs = [];
    let bytes = 0;
    for (const { version, asset, sourceCreatedAt } of selected) {
      const metadata = version.creativeMetadata ?? { model: '', prompt: '', sourceLabel: '', referenceImageVersionIds: [] };
      const references = [...new Set([...(metadata.gridImageVersionId ? [metadata.gridImageVersionId] : []), ...metadata.referenceImageVersionIds])];
      const grant = await issueGrant(ctx, { destinationKey: 'trailer-feed', versionId: version._id, referenceVersionIds: references,
        allowedOrigins: ['https://www.trailerfeed.video', 'https://trailerfeed.video'] });
      const media = (id: string, variant = 'original') => `https://review.v1su4.dev/api/destination-media/${grant.slug}/${id}/${variant}`;
      const identity = { source_asset_id: asset._id, source_version_id: version._id, source_created_at: new Date(sourceCreatedAt).toISOString(), consent_generation: grant.consentGeneration };
      const payloadJson = JSON.stringify({ ...identity, run_id: connection.targetRunId, batch_id: args.confirmationId,
        source_asset_code: asset.assetCode ?? asset.title,
        media_url: media(version._id), ...(version.posterKey ? { poster_url: media(version._id, 'poster') } : {}), metadata,
        ...(metadata.gridImageVersionId ? { grid: { source_version_id: metadata.gridImageVersionId, media_url: media(metadata.gridImageVersionId) } } : {}),
        references: metadata.referenceImageVersionIds.map(id => ({ source_version_id: id, media_url: media(id) })) });
      const length = new TextEncoder().encode(payloadJson).byteLength;
      bytes += length;
      if (length > 800000 || bytes > 4 * 1024 * 1024) throw new ConvexError({ code: 'SYNC_BATCH_TOO_LARGE' });
      jobs.push({ versionId: version._id, assetId: asset._id, consentGeneration: grant.consentGeneration, payloadJson, identity });
    }
    const now = Date.now();
    const batchId = await ctx.db.insert('syncBatches', { confirmationId: args.confirmationId, connectionId: connection._id, projectId: connection.projectId,
      requestFingerprint, reservationJson: JSON.stringify({ batch_id: args.confirmationId, run_id: connection.targetRunId, versions: jobs.map(job => job.identity) }),
      orderedVersionIds: jobs.map(job => job.versionId), state: 'queued', attempts: 0, createdAt: now, updatedAt: now });
    for (const job of jobs) await ctx.db.insert('syncOutbox', { batchId, connectionId: connection._id, projectId: connection.projectId,
      versionId: job.versionId, assetId: job.assetId, consentGeneration: job.consentGeneration, payloadJson: job.payloadJson,
      state: 'queued', attempts: 0, createdAt: now, updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.destinationDelivery.reserve, { batchId });
    return { batchId };
  },
});

export const claimBatch = internalMutation({
  args: { batchId: v.id('syncBatches') },
  handler: async (ctx, args): Promise<{ token: string; reservationJson: string } | null> => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.state !== 'queued' || (batch.leaseUntil ?? 0) > Date.now()) return null;
    const token = randomSecret();
    await ctx.db.patch(batch._id, { attemptToken: token, leaseUntil: Date.now() + 30000, attempts: batch.attempts + 1, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(31000, internal.destinationDelivery.reserve, args);
    return { token, reservationJson: batch.reservationJson };
  },
});

export const finishReservation = internalMutation({
  args: { batchId: v.id('syncBatches'), token: v.string(), ok: v.boolean(), disconnected: v.optional(v.boolean()), error: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.attemptToken !== args.token || batch.state !== 'queued') return;
    await ctx.db.patch(batch._id, { state: args.ok ? 'reserved' : 'failed', attemptToken: undefined, leaseUntil: undefined, lastError: args.error, updatedAt: Date.now() });
    const jobs = await ctx.db.query('syncOutbox').withIndex('by_batch', q => q.eq('batchId', batch._id)).collect();
    for (const job of jobs) if (job.state === 'queued') {
      if (args.ok) await ctx.scheduler.runAfter(0, internal.destinationDelivery.item, { jobId: job._id });
      else await ctx.db.patch(job._id, { state: args.disconnected ? 'disconnected' : 'failed', lastError: args.error ?? 'Destination reservation failed', updatedAt: Date.now() });
    }
  },
});

async function stillAuthorized(ctx: MutationCtx, job: { connectionId: Id<'destinationConnections'>; projectId: Id<'projects'>; assetId: Id<'videos'>; versionId: Id<'assetVersions'>; consentGeneration: number }) {
  const connection = await ctx.db.get(job.connectionId);
  const project = await ctx.db.get(job.projectId);
  const asset = await ctx.db.get(job.assetId);
  const version = await ctx.db.get(job.versionId);
  const grant = await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', 'trailer-feed').eq('versionId', job.versionId)).unique();
  if (!(connection && project && !project.archived && project.createdBy === connection.createdBy && asset && asset.projectId === project._id && asset.status !== 'archived' && version && version.assetId === asset._id && version.processingState === 'ready' && grant && grant.projectId === project._id && grant.assetId === asset._id && grant.createdBy === connection.createdBy && grant.consentGeneration === job.consentGeneration && grant.revokedAt === undefined && (grant.expiresAt === undefined || grant.expiresAt > Date.now()))) return false;
  for (const id of grant.referenceVersionIds) {
    const reference = await ctx.db.get(id);
    const image = reference && await ctx.db.get(reference.assetId);
    if (!reference || reference.processingState !== 'ready' || !reference.mimeType.startsWith('image/') || !image || image.assetClass === 'VID' || image.projectId !== project._id || image.status === 'archived') return false;
  }
  return true;
}

export const claimItem = internalMutation({
  args: { jobId: v.id('syncOutbox') },
  handler: async (ctx, args): Promise<{ token: string; payloadJson: string } | null> => {
    const job = await ctx.db.get(args.jobId);
    if (!job || (job.state !== 'queued' && job.state !== 'sending') || (job.leaseUntil ?? 0) > Date.now()) return null;
    const batch = await ctx.db.get(job.batchId);
    if (!batch || batch.state !== 'reserved') return null;
    if (!await stillAuthorized(ctx, job)) {
      await ctx.db.patch(job._id, { state: 'disconnected', lastError: 'Source consent no longer authorizes this version', updatedAt: Date.now() });
      return null;
    }
    const token = randomSecret();
    await ctx.db.patch(job._id, { state: 'sending', attemptToken: token, leaseUntil: Date.now() + 30000, attempts: job.attempts + 1, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(31000, internal.destinationDelivery.item, args);
    return { token, payloadJson: job.payloadJson };
  },
});

export const finishItem = internalMutation({
  args: { jobId: v.id('syncOutbox'), token: v.string(), ok: v.boolean(), disconnected: v.optional(v.boolean()), error: v.optional(v.string()), targetArtifactId: v.optional(v.string()), targetVersionNumber: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.attemptToken !== args.token || job.state !== 'sending') return;
    const authorized = await stillAuthorized(ctx, job);
    const state = !authorized || args.disconnected ? 'disconnected' : args.ok ? 'synced' : 'failed';
    await ctx.db.patch(job._id, { state, attemptToken: undefined, leaseUntil: undefined,
      targetArtifactId: args.targetArtifactId, targetVersionNumber: args.targetVersionNumber,
      lastError: !authorized ? 'Source consent changed during delivery' : args.error, updatedAt: Date.now() });
    const jobs = await ctx.db.query('syncOutbox').withIndex('by_batch', q => q.eq('batchId', job.batchId)).collect();
    if (jobs.every(item => item.state === 'synced')) await ctx.db.patch(job.batchId, { state: 'complete', updatedAt: Date.now() });
  },
});

export const retry = internalMutation({
  args: { batchId: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const id = ctx.db.normalizeId('syncBatches', args.batchId);
    const batch = id && await ctx.db.get(id);
    if (!batch) throw new ConvexError({ code: 'SYNC_BATCH_UNAVAILABLE' });
    await ownedProject(ctx, batch.projectId);
    const jobs = await ctx.db.query('syncOutbox').withIndex('by_batch', q => q.eq('batchId', batch._id)).collect();
    const failed = jobs.filter(job => job.state === 'failed');
    if (!failed.length) return;
    for (const job of failed) await ctx.db.patch(job._id, { state: 'queued', attemptToken: undefined, leaseUntil: undefined, lastError: undefined, updatedAt: Date.now() });
    if (batch.state === 'failed') {
      await ctx.db.patch(batch._id, { state: 'queued', attemptToken: undefined, leaseUntil: undefined, lastError: undefined, updatedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.destinationDelivery.reserve, { batchId: batch._id });
    } else for (const job of failed) await ctx.scheduler.runAfter(0, internal.destinationDelivery.item, { jobId: job._id });
  },
});
