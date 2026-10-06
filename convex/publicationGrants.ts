import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { owner, normalizeOrigins } from './personal';
import { randomSecret } from './lib/reviewAccess';

function publicGrant(grant: Doc<'publicationGrants'>) {
  return { grantId: grant._id, slug: grant.slug, destinationKey: grant.destinationKey,
    versionId: grant.versionId, referenceVersionIds: grant.referenceVersionIds, expiresAt: grant.expiresAt,
    mediaPath: `/api/destination-media/${grant.slug}/${grant.versionId}/original` };
}

export const issue = internalMutation({
  args: { destinationKey: v.literal('trailer-feed'), versionId: v.string(), allowedOrigins: v.array(v.string()), referenceVersionIds: v.optional(v.array(v.string())), expiresAt: v.optional(v.number()) },
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
    const referenceVersionIds = [...new Set(args.referenceVersionIds ?? [])].map(id => {
      const normalized = ctx.db.normalizeId('assetVersions', id);
      if (!normalized) throw new ConvexError({ code: 'GRANT_REFERENCE_UNAVAILABLE' });
      return normalized;
    });
    if (referenceVersionIds.length > 21) throw new ConvexError({ code: 'GRANT_TOO_MANY_REFERENCES' });
    const references = await Promise.all(referenceVersionIds.map(id => ctx.db.get(id)));
    for (const reference of references) {
      const image = reference && await ctx.db.get(reference.assetId);
      if (!reference || !image || image.projectId !== project._id || image.status === 'archived' || image.assetClass === 'VID' || !reference.mimeType.startsWith('image/')) throw new ConvexError({ code: 'GRANT_REFERENCE_UNAVAILABLE' });
      if (reference.processingState !== 'ready') throw new ConvexError({ code: 'GRANT_MEDIA_NOT_READY' });
    }
    const existing = await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', args.destinationKey).eq('versionId', version._id)).unique();
    if (existing) {
      if (existing.revokedAt !== undefined) throw new ConvexError({ code: 'GRANT_REVOKED' });
      if (existing.expiresAt !== undefined && existing.expiresAt <= Date.now()) throw new ConvexError({ code: 'GRANT_EXPIRED' });
      if (existing.expiresAt !== args.expiresAt || existing.referenceVersionIds.length !== referenceVersionIds.length || referenceVersionIds.some(id => !existing.referenceVersionIds.includes(id)) || existing.allowedOrigins.length !== allowedOrigins.length || allowedOrigins.some(origin => !existing.allowedOrigins.includes(origin))) throw new ConvexError({ code: 'GRANT_CONSENT_CHANGED' });
      return publicGrant(existing);
    }
    if (args.expiresAt !== undefined && (!Number.isSafeInteger(args.expiresAt) || args.expiresAt <= Date.now())) throw new ConvexError({ code: 'GRANT_INVALID_EXPIRY' });
    const grantId = await ctx.db.insert('publicationGrants', { destinationKey: args.destinationKey,
      projectId: project._id, assetId: asset._id, versionId: version._id, createdBy: profile._id,
      slug: randomSecret(), allowedOrigins, referenceVersionIds, expiresAt: args.expiresAt, createdAt: Date.now() });
    return publicGrant((await ctx.db.get(grantId))!);
  },
});

export const revoke = internalMutation({
  args: { grantId: v.string() },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    const id = ctx.db.normalizeId('publicationGrants', args.grantId);
    const grant = id && await ctx.db.get(id);
    if (!grant || grant.createdBy !== profile._id) throw new ConvexError({ code: 'GRANT_UNAVAILABLE' });
    if (grant.revokedAt === undefined) await ctx.db.patch(grant._id, { revokedAt: Date.now() });
    return { grantId: grant._id, revoked: true };
  },
});

/** Private lookup for the HTTP transport; fresh authorization precedes every delivery. */
export const resolve = internalQuery({
  args: { slug: v.string(), versionId: v.string(), variant: v.union(v.literal('original'), v.literal('poster')), origin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const grant = await ctx.db.query('publicationGrants').withIndex('by_slug', q => q.eq('slug', args.slug)).unique();
    const id = ctx.db.normalizeId('assetVersions', args.versionId);
    if (!grant || grant.revokedAt !== undefined || (grant.expiresAt !== undefined && grant.expiresAt <= Date.now()) || !id || (id !== grant.versionId && !grant.referenceVersionIds.includes(id)) || (args.origin && !grant.allowedOrigins.includes(args.origin))) return null;
    const root = await ctx.db.get(grant.versionId);
    const asset = root && await ctx.db.get(root.assetId);
    const project = asset && await ctx.db.get(asset.projectId);
    if (!root || root.processingState !== 'ready' || !asset || asset._id !== grant.assetId || asset.status === 'archived' || !project || project._id !== grant.projectId || project.archived || project.createdBy !== grant.createdBy) return null;
    const version = id === root._id ? root : await ctx.db.get(id);
    const media = version && (id === root._id ? asset : await ctx.db.get(version.assetId));
    if (!version || version.processingState !== 'ready' || !media || media.projectId !== grant.projectId || media.status === 'archived' || (id !== root._id && (media.assetClass === 'VID' || !version.mimeType.startsWith('image/')))) return null;
    const key = args.variant === 'poster' ? version.posterKey : version.originalKey;
    return key ? { key, mimeType: args.variant === 'poster' ? 'image/jpeg' : version.mimeType } : null;
  },
});
