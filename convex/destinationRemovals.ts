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

/** Runs in the source deletion transaction; delivery survives removal of source/project rows. */
export async function sourceDeleted(ctx: MutationCtx, asset: Doc<'videos'>, versions: Doc<'assetVersions'>[]) {
  const deleted = new Set<string>(versions.map(version=>version._id));
  const projectGrants = await ctx.db.query('publicationGrants').withIndex('by_project',q=>q.eq('projectId',asset.projectId)).collect();
  const auxiliary = await ctx.db.query('publicationReferenceGrants').withIndex('by_project', q => q.eq('projectId', asset.projectId)).collect();
  const linkedAuxiliary = auxiliary.filter(grant => grant.referenceVersionIds.some(id => deleted.has(id)));
  const linkedGrants = projectGrants.filter(grant=>!deleted.has(grant.versionId) && (grant.referenceVersionIds.some(id=>deleted.has(id)) || linkedAuxiliary.some(imageGrant => imageGrant.rootGrantId === grant._id && imageGrant.consentGeneration === grant.consentGeneration)));
  for (const grant of linkedAuxiliary) await ctx.db.patch(grant._id, { referenceVersionIds: grant.referenceVersionIds.filter(id => !deleted.has(id)) });
  for (const grant of linkedGrants) {
    // Removing a deleted reference contracts consent; the surviving video grant stays valid.
    await ctx.db.patch(grant._id,{referenceVersionIds:grant.referenceVersionIds.filter(id=>!deleted.has(id))});
    const jobs = await ctx.db.query('syncOutbox').withIndex('by_version',q=>q.eq('versionId',grant.versionId)).collect();
    for (const job of jobs) {
      const payload = JSON.parse(job.payloadJson);
      payload.metadata = withoutReferences(payload.metadata,deleted);
      payload.references = payload.references.filter((reference:{source_version_id:string})=>!deleted.has(reference.source_version_id));
      if (payload.grid && deleted.has(payload.grid.source_version_id)) delete payload.grid;
      await ctx.db.patch(job._id,{payloadJson:JSON.stringify(payload),updatedAt:Date.now()});
    }
  }
  if (versions.some(version=>version.mimeType.startsWith('image/'))) {
    const assets = await ctx.db.query('videos').withIndex('by_project',q=>q.eq('projectId',asset.projectId)).collect();
    for (const candidate of assets) {
      if (candidate._id === asset._id) continue;
      const candidates = await ctx.db.query('assetVersions').withIndex('by_asset',q=>q.eq('assetId',candidate._id)).collect();
      for (const version of candidates) {
        const metadata = version.creativeMetadata;
        if (metadata && (metadata.referenceImageVersionIds.some(id=>deleted.has(id)) || (metadata.gridImageVersionId && deleted.has(metadata.gridImageVersionId)))) await ctx.db.patch(version._id,{creativeMetadata:withoutReferences(metadata,deleted),metadataUpdatedAt:Math.max(Date.now(),(version.metadataUpdatedAt ?? 0)+1)});
      }
    }
  }
  for (const version of versions) {
    const grant = await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', 'trailer-feed').eq('versionId', version._id)).unique();
    const jobs = await ctx.db.query('syncOutbox').withIndex('by_version', q => q.eq('versionId', version._id)).collect();
    const references = linkedGrants.filter(grant=>grant.referenceVersionIds.includes(version._id) || linkedAuxiliary.some(imageGrant => imageGrant.rootGrantId === grant._id && imageGrant.consentGeneration === grant.consentGeneration && imageGrant.referenceVersionIds.includes(version._id)));
    if (!grant && !jobs.length && !references.length) continue;
    if (grant && grant.revokedAt === undefined) await ctx.db.patch(grant._id, { revokedAt: Date.now() });
    for (const job of jobs) await ctx.db.patch(job._id, { state:'source_deleted', attemptToken:undefined, leaseUntil:undefined, lastError:'Source version was deleted', updatedAt:Date.now() });
    const existing = await ctx.db.query('destinationRemovals').withIndex('by_source_version', q => q.eq('sourceVersionId', version._id)).unique();
    if (existing) continue;
    const jobId = await ctx.db.insert('destinationRemovals', { projectId:asset.projectId, sourceAssetId:asset._id, sourceVersionId:version._id,
      consentGeneration:Math.max(grant?.consentGeneration ?? 1, ...jobs.map(job => job.consentGeneration),...references.map(grant=>grant.consentGeneration)), state:'queued', attempts:0, nextAttemptAt:Date.now(), createdAt:Date.now(), updatedAt:Date.now() });
    await ctx.scheduler.runAfter(0, internal.destinationDelivery.removeSource, {jobId});
  }
}

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
