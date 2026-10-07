import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { randomSecret } from './lib/reviewAccess';

function withoutReferences(metadata: NonNullable<Doc<'assetVersions'>['creativeMetadata']>, deleted: Set<string>) {
  const {gridImageVersionId, ...rest} = metadata;
  return {...rest,referenceImageVersionIds:metadata.referenceImageVersionIds.filter(id=>!deleted.has(id)),
    ...(gridImageVersionId && !deleted.has(gridImageVersionId) ? {gridImageVersionId}:{})};
}

/** Capture exact identity before source/project rows disappear. */
export async function sourceDeleted(ctx: MutationCtx, asset: Doc<'videos'>, versions: Doc<'assetVersions'>[]) {
  for (const version of versions) {
    const grant = await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', 'trailer-feed').eq('versionId', version._id)).unique();
    // Read one payload at most; historical generations are paged later.
    const job = await ctx.db.query('syncOutbox').withIndex('by_version', q => q.eq('versionId', version._id)).first();
    if (!grant && !job && !version.mimeType.startsWith('image/')) continue;
    if (grant && grant.revokedAt === undefined) await ctx.db.patch(grant._id, { revokedAt: Date.now() });
    if (job) await ctx.db.patch(job._id, { state:'source_deleted', attemptToken:undefined, leaseUntil:undefined, lastError:'Source version was deleted', updatedAt:Date.now() });
    const existing = await ctx.db.query('destinationRemovals').withIndex('by_source_version', q => q.eq('sourceVersionId', version._id)).unique();
    if (existing) continue;
    const jobId = await ctx.db.insert('destinationRemovals', { projectId:asset.projectId, sourceAssetId:asset._id, sourceVersionId:version._id,
      consentGeneration:grant?.consentGeneration ?? job?.consentGeneration ?? 1, state:'queued', attempts:0, nextAttemptAt:Date.now(), createdAt:Date.now(), updatedAt:Date.now() });
    await ctx.scheduler.runAfter(0, internal.destinationDelivery.removeSource, {jobId});
    await ctx.scheduler.runAfter(0, internal.destinationRemovals.cleanup, { jobId, stage: version.mimeType.startsWith('image/') ? 'grants' : 'deletedJobs' });
  }
}

/** Only recorded source deletions can contract saved consent during cleanup. */
export async function contractDeletedReferences(ctx: MutationCtx, job: Doc<'syncOutbox'>) {
  const payload = JSON.parse(job.payloadJson);
  const ids = new Set<string>([...(payload.metadata?.referenceImageVersionIds ?? []), ...(payload.metadata?.gridImageVersionId ? [payload.metadata.gridImageVersionId] : []), ...(payload.references ?? []).map((reference: {source_version_id:string}) => reference.source_version_id), ...(payload.grid ? [payload.grid.source_version_id] : [])]);
  const deleted = new Set<string>();
  for (const id of ids) if (await ctx.db.query('destinationRemovals').withIndex('by_source_version', q => q.eq('sourceVersionId', id)).unique()) deleted.add(id);
  if (!deleted.size) return job;
  payload.metadata = withoutReferences(payload.metadata, deleted);
  payload.references = (payload.references ?? []).filter((reference:{source_version_id:string})=>!deleted.has(reference.source_version_id));
  if (payload.grid && deleted.has(payload.grid.source_version_id)) delete payload.grid;
  const payloadJson = JSON.stringify(payload);
  await ctx.db.patch(job._id, { payloadJson, updatedAt: Date.now() });
  return { ...job, payloadJson };
}

// One large payload/version per continuation; scalar arguments survive purge.
export const cleanup = internalMutation({
  args: { jobId: v.id('destinationRemovals'), stage: v.union(v.literal('grants'), v.literal('auxiliary'), v.literal('jobs'), v.literal('assets'), v.literal('versions'), v.literal('deletedJobs')), cursor: v.optional(v.string()), assetId: v.optional(v.id('videos')), assetCursor: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const removal = await ctx.db.get(args.jobId);
    if (!removal) return;
    const projectId = ctx.db.normalizeId('projects', removal.projectId);
    const versionId = ctx.db.normalizeId('assetVersions', removal.sourceVersionId);
    if (!projectId || !versionId) return;
    const deleted = new Set([removal.sourceVersionId]);
    const next = async (stage: typeof args.stage, cursor?: string, assetId?: typeof args.assetId, assetCursor?: string) => {
      await ctx.scheduler.runAfter(0, internal.destinationRemovals.cleanup, { jobId: args.jobId, stage, ...(cursor ? {cursor}:{}), ...(assetId ? {assetId}:{}), ...(assetCursor ? {assetCursor}:{}) });
    };
    if (args.stage === 'grants' || args.stage === 'auxiliary') {
      const page = args.stage === 'grants'
        ? await ctx.db.query('publicationGrants').withIndex('by_project', q => q.eq('projectId', projectId)).paginate({cursor: args.cursor ?? null, numItems:10})
        : await ctx.db.query('publicationReferenceGrants').withIndex('by_project', q => q.eq('projectId', projectId)).paginate({cursor: args.cursor ?? null, numItems:10});
      for (const grant of page.page) if (grant.referenceVersionIds.includes(versionId)) await ctx.db.patch(grant._id, { referenceVersionIds: grant.referenceVersionIds.filter(id => id !== versionId) });
      await next(page.isDone ? args.stage === 'grants' ? 'auxiliary' : 'jobs' : args.stage, page.isDone ? undefined : page.continueCursor);
    } else if (args.stage === 'jobs' || args.stage === 'deletedJobs') {
      const page = args.stage === 'jobs'
        ? await ctx.db.query('syncOutbox').withIndex('by_project', q => q.eq('projectId', projectId)).paginate({cursor: args.cursor ?? null, numItems:1})
        : await ctx.db.query('syncOutbox').withIndex('by_version', q => q.eq('versionId', versionId)).paginate({cursor: args.cursor ?? null, numItems:1});
      for (const job of page.page) {
        if (job.versionId === versionId) await ctx.db.patch(job._id, { state:'source_deleted', attemptToken:undefined, leaseUntil:undefined, lastError:'Source version was deleted', updatedAt:Date.now() });
        else await contractDeletedReferences(ctx, job);
      }
      if (!page.isDone) await next(args.stage, page.continueCursor);
      else if (args.stage === 'jobs') await next('assets');
    } else if (args.stage === 'assets') {
      const page = await ctx.db.query('videos').withIndex('by_project', q => q.eq('projectId', projectId)).paginate({cursor:args.cursor ?? null,numItems:1});
      if (page.page.length) await next('versions', undefined, page.page[0]._id, page.isDone ? undefined : page.continueCursor);
    } else if (args.assetId) {
      const page = await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', args.assetId!)).paginate({cursor:args.cursor ?? null,numItems:1});
      for (const version of page.page) {
        const metadata = version.creativeMetadata;
        if (metadata && (metadata.referenceImageVersionIds.includes(versionId) || metadata.gridImageVersionId === versionId)) await ctx.db.patch(version._id, {creativeMetadata:withoutReferences(metadata,deleted),metadataUpdatedAt:Math.max(Date.now(),(version.metadataUpdatedAt ?? 0)+1)});
      }
      if (!page.isDone) await next('versions',page.continueCursor,args.assetId,args.assetCursor);
      else if (args.assetCursor) await next('assets',args.assetCursor);
    }
  },
});

export const claim = internalMutation({
  args: {jobId:v.id('destinationRemovals')},
  handler: async (ctx,{jobId}): Promise<{token:string;payload:{source_asset_id:string;source_version_id:string;consent_generation:number}}|null> => {
    const job = await ctx.db.get(jobId);
    if (!job || job.state === 'complete' || job.nextAttemptAt > Date.now() || (job.leaseUntil ?? 0) > Date.now()) return null;
    const token = randomSecret();
    await ctx.db.patch(jobId, {state:'sending', attemptToken:token, leaseUntil:Date.now()+30000, attempts:job.attempts+1, updatedAt:Date.now()});
    await ctx.scheduler.runAfter(31000, internal.destinationDelivery.removeSource, {jobId});
    return {token,payload:{source_asset_id:job.sourceAssetId,source_version_id:job.sourceVersionId,consent_generation:job.consentGeneration}};
  },
});

export const finish = internalMutation({
  args: {jobId:v.id('destinationRemovals'),token:v.string(),ok:v.boolean(),error:v.optional(v.string())},
  handler: async (ctx,args):Promise<void> => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.state !== 'sending' || job.attemptToken !== args.token) return;
    const delay = Math.min(3600000,30000*2**Math.min(job.attempts-1,7));
    await ctx.db.patch(job._id, {state:args.ok ? 'complete':'queued', attemptToken:undefined, leaseUntil:undefined,
      nextAttemptAt:args.ok ? Date.now():Date.now()+delay, lastError:args.ok ? undefined:args.error ?? 'Source removal will retry', updatedAt:Date.now()});
    if (!args.ok) await ctx.scheduler.runAfter(delay, internal.destinationDelivery.removeSource, {jobId:job._id});
  },
});
