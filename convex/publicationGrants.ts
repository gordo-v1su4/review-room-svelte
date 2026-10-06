import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { owner, normalizeOrigins } from './personal';
import { randomSecret } from './lib/reviewAccess';

function publicGrant(grant: Doc<'publicationGrants'>) {
  return { grantId: grant._id, slug: grant.slug, destinationKey: grant.destinationKey,
    versionId: grant.versionId, mediaPath: `/api/destination-media/${grant.slug}/${grant.versionId}/original` };
}

export const issue = internalMutation({
  args: { destinationKey: v.literal('trailer-feed'), versionId: v.string(), allowedOrigins: v.array(v.string()) },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    const id = ctx.db.normalizeId('assetVersions', args.versionId);
    const version = id && await ctx.db.get(id);
    const asset = version && await ctx.db.get(version.assetId);
    const project = asset && await ctx.db.get(asset.projectId);
    if (!version || !asset || !project || project.createdBy !== profile._id || project.archived || asset.status === 'archived') throw new ConvexError({ code: 'GRANT_VERSION_UNAVAILABLE' });
    if (version.processingState !== 'ready') throw new ConvexError({ code: 'GRANT_MEDIA_NOT_READY' });
    const allowedOrigins = normalizeOrigins(args.allowedOrigins);
    if (!allowedOrigins.length) throw new ConvexError({ code: 'GRANT_ORIGIN_REQUIRED' });
    const existing = await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', args.destinationKey).eq('versionId', version._id)).unique();
    if (existing) return publicGrant(existing);
    const grantId = await ctx.db.insert('publicationGrants', { destinationKey: args.destinationKey,
      projectId: project._id, assetId: asset._id, versionId: version._id, createdBy: profile._id,
      slug: randomSecret(), allowedOrigins, createdAt: Date.now() });
    return publicGrant((await ctx.db.get(grantId))!);
  },
});

/** Private lookup for the HTTP transport; fresh authorization precedes every delivery. */
export const resolve = internalQuery({
  args: { slug: v.string(), versionId: v.string(), variant: v.union(v.literal('original'), v.literal('poster')), origin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const grant = await ctx.db.query('publicationGrants').withIndex('by_slug', q => q.eq('slug', args.slug)).unique();
    const id = ctx.db.normalizeId('assetVersions', args.versionId);
    if (!grant || id !== grant.versionId || (args.origin && !grant.allowedOrigins.includes(args.origin))) return null;
    const version = await ctx.db.get(grant.versionId);
    const asset = version && await ctx.db.get(version.assetId);
    const project = asset && await ctx.db.get(asset.projectId);
    if (!version || version.processingState !== 'ready' || !asset || asset._id !== grant.assetId || asset.status === 'archived' || !project || project._id !== grant.projectId || project.archived || project.createdBy !== grant.createdBy) return null;
    const key = args.variant === 'poster' ? version.posterKey : version.originalKey;
    return key ? { key, mimeType: args.variant === 'poster' ? 'image/jpeg' : version.mimeType } : null;
  },
});
