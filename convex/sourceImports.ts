import { parseSourceImport } from './lib/sourceImport';
import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { owner } from './personal';

export const save = internalMutation({
  args: { sourceProjectId: v.string(), projectId: v.id('projects'), folderId: v.id('projectFolders'), sourceDocumentsJson: v.string(), mediaMappingsJson: v.string() },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    const project = await ctx.db.get(args.projectId);
    const folder = await ctx.db.get(args.folderId);
    if (!project || project.createdBy !== profile._id || !folder || folder.projectId !== project._id) throw new Error('Import destination unavailable');
    if (args.sourceDocumentsJson.length + args.mediaMappingsJson.length > 700000) throw new Error('Import metadata too large');
    const { mediaMappings: mappings } = parseSourceImport(args.sourceDocumentsJson, args.mediaMappingsJson);
    for (const mapping of mappings) {
      const assetId = ctx.db.normalizeId('videos', mapping.assetId);
      if (!assetId) throw new Error('Invalid import mapping asset ID');
      const asset = await ctx.db.get(assetId);
      if (!asset || !('projectId' in asset) || asset.projectId !== project._id) throw new Error('Imported asset belongs to another project');
    }
    const existing = await ctx.db.query('sourceImports').withIndex('by_source', q => q.eq('sourceApp', 'trailer-feed').eq('sourceProjectId', args.sourceProjectId)).unique();
    if (existing && (existing.projectId !== project._id || existing.folderId !== folder._id)) throw new Error('Source project already imported elsewhere');
    if (existing) { await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() }); return existing._id; }
    return await ctx.db.insert('sourceImports', { ...args, sourceApp: 'trailer-feed', createdAt: Date.now(), updatedAt: Date.now() });
  },
});

export const list = internalQuery({ args: {}, handler: async (ctx) => {
  const profile = await owner(ctx);
  const projects = await ctx.db.query('projects').withIndex('by_creator', q => q.eq('createdBy', profile._id)).collect();
  return (await Promise.all(projects.map(project => ctx.db.query('sourceImports').withIndex('by_project', q => q.eq('projectId', project._id)).collect()))).flat();
} });
