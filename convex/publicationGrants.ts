import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { owner, normalizeOrigins } from './personal';
import { randomSecret } from './lib/reviewAccess';

function publicGrant(grant: Doc<'publicationGrants'>) {
  return { grantId: grant._id, slug: grant.slug, destinationKey: grant.destinationKey,
    versionId: grant.versionId, referenceVersionIds: grant.referenceVersionIds, expiresAt: grant.expiresAt, consentGeneration: grant.consentGeneration,
    mediaPath: `/api/destination-media/${grant.slug}/${grant.versionId}/original` };
}

const selectionFields = { destinationKey: v.literal('trailer-feed'), versionId: v.string(), allowedOrigins: v.array(v.string()), referenceVersionIds: v.optional(v.array(v.string())), expiresAt: v.optional(v.number()) };
type Selection = { destinationKey: 'trailer-feed'; versionId: string; allowedOrigins: string[]; referenceVersionIds?: string[]; expiresAt?: number };

async function prepareSelection(ctx: MutationCtx, args: Selection) {
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
  return { profile, version, asset, project, allowedOrigins, referenceVersionIds, expiresAt: args.expiresAt };
}

function sameConsent(grant: Doc<'publicationGrants'>, selection: Awaited<ReturnType<typeof prepareSelection>>) {
  return grant.expiresAt === selection.expiresAt && grant.referenceVersionIds.length === selection.referenceVersionIds.length && selection.referenceVersionIds.every(id => grant.referenceVersionIds.includes(id)) && grant.allowedOrigins.length === selection.allowedOrigins.length && selection.allowedOrigins.every(origin => grant.allowedOrigins.includes(origin));
}

function validateExpiry(expiresAt?: number) {
  if (expiresAt !== undefined && (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now())) throw new ConvexError({ code: 'GRANT_INVALID_EXPIRY' });
}

export async function issueGrant(ctx: MutationCtx, args: Selection) {
    const selection = await prepareSelection(ctx, args);
    const { profile, version, asset, project, allowedOrigins, referenceVersionIds } = selection;
    const existing = await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', args.destinationKey).eq('versionId', version._id)).unique();
    if (existing) {
      if (existing.consentGeneration !== 1) throw new ConvexError({ code: 'GRANT_CONSENT_CHANGED' });
      if (existing.revokedAt !== undefined) throw new ConvexError({ code: 'GRANT_REVOKED' });
      if (existing.expiresAt !== undefined && existing.expiresAt <= Date.now()) throw new ConvexError({ code: 'GRANT_EXPIRED' });
      if (!sameConsent(existing, selection)) throw new ConvexError({ code: 'GRANT_CONSENT_CHANGED' });
      return publicGrant(existing);
    }
    validateExpiry(args.expiresAt);
    const grantId = await ctx.db.insert('publicationGrants', { destinationKey: args.destinationKey,
      projectId: project._id, assetId: asset._id, versionId: version._id, createdBy: profile._id,
      slug: randomSecret(), allowedOrigins, referenceVersionIds, expiresAt: args.expiresAt, consentGeneration: 1, createdAt: Date.now() });
    return publicGrant((await ctx.db.get(grantId))!);
}

export const issue = internalMutation({ args: selectionFields, handler: issueGrant });

export const confirmAgain = internalMutation({
  args: { ...selectionFields, expectedGeneration: v.number(), nextGeneration: v.optional(v.number()), confirmationId: v.string() },
  handler: async (ctx, args) => {
    const selection = await prepareSelection(ctx, args);
    const grant = await ctx.db.query('publicationGrants').withIndex('by_destination_version', q => q.eq('destinationKey', args.destinationKey).eq('versionId', selection.version._id)).unique();
    if (!grant || grant.createdBy !== selection.profile._id) throw new ConvexError({ code: 'GRANT_UNAVAILABLE' });
    const nextGeneration = args.nextGeneration ?? args.expectedGeneration + 1;
    if (!Number.isSafeInteger(args.expectedGeneration) || args.expectedGeneration < 1 || !Number.isSafeInteger(nextGeneration) || nextGeneration <= args.expectedGeneration || nextGeneration > 2147483647 || !/^[A-Za-z0-9_-]{1,128}$/.test(args.confirmationId)) throw new ConvexError({ code: 'GRANT_INVALID_CONFIRMATION' });
    if (grant.lastConfirmationId === args.confirmationId) {
      if (grant.consentGeneration !== nextGeneration || !sameConsent(grant, selection)) throw new ConvexError({ code: 'GRANT_CONSENT_CHANGED' });
      if (grant.revokedAt !== undefined) throw new ConvexError({ code: 'GRANT_REVOKED' });
      if (grant.expiresAt !== undefined && grant.expiresAt <= Date.now()) throw new ConvexError({ code: 'GRANT_EXPIRED' });
      return publicGrant(grant);
    }
    if (grant.consentGeneration !== args.expectedGeneration) throw new ConvexError({ code: 'GRANT_GENERATION_CHANGED' });
    validateExpiry(args.expiresAt);
    await ctx.db.patch(grant._id, { slug: randomSecret(), allowedOrigins: selection.allowedOrigins,
      referenceVersionIds: selection.referenceVersionIds, expiresAt: args.expiresAt, revokedAt: undefined,
      consentGeneration: nextGeneration, lastConfirmationId: args.confirmationId });
    return publicGrant((await ctx.db.get(grant._id))!);
  },
});

export const revoke = internalMutation({
  args: { grantId: v.string(), expectedGeneration: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    const id = ctx.db.normalizeId('publicationGrants', args.grantId);
    const grant = id && await ctx.db.get(id);
    if (!grant || grant.createdBy !== profile._id) throw new ConvexError({ code: 'GRANT_UNAVAILABLE' });
    if (grant.consentGeneration !== (args.expectedGeneration ?? 1)) throw new ConvexError({ code: 'GRANT_GENERATION_CHANGED' });
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
    return key ? { key, mimeType: args.variant === 'poster' ? 'image/jpeg' : version.mimeType, expiresAt: grant.expiresAt } : null;
  },
});
