import { v } from 'convex/values';
import { internalQuery } from './_generated/server';
import { getReviewLink } from './lib/reviewAccess';

// Every download rechecks the live link and asset permissions before storage reads.
export const download = internalQuery({
  args: { token: v.string(), accessKey: v.optional(v.string()), assetId: v.id('videos'), versionId: v.id('assetVersions'), checkedAt: v.number() },
  handler: async (ctx, args) => {
    const { link, project } = await getReviewLink(ctx, args.token, args.accessKey);
    const asset = await ctx.db.get(args.assetId);
    if (!link.canDownload || !asset || !asset.downloadEnabled || asset.projectId !== project._id || asset.status === 'archived' || asset.processingStatus !== 'ready' || asset.currentVersionId !== args.versionId) return null;
    const version = await ctx.db.get(args.versionId);
    if (!version || version.assetId !== asset._id || version.processingState !== 'ready') return null;
    return { key: version.originalKey, mimeType: version.mimeType, name: asset.originalFilename };
  }
});
