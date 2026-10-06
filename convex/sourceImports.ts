import { parseSourceImport, importedMediaMetadata } from './lib/sourceImport';
import { writeVersionMetadata } from './lib/versionMetadata';
import type { Id } from './_generated/dataModel';
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
      if (mapping.versionId) {
        const versionId = ctx.db.normalizeId('assetVersions', mapping.versionId);
        const version = versionId && await ctx.db.get(versionId);
        if (!version || version.assetId !== assetId) throw new Error('Invalid import mapping version ID');
      }
    }
    const existing = await ctx.db.query('sourceImports').withIndex('by_source', q => q.eq('sourceApp', 'trailer-feed').eq('sourceProjectId', args.sourceProjectId)).unique();
    if (existing && (existing.projectId !== project._id || existing.folderId !== folder._id)) throw new Error('Source project already imported elsewhere');
    if (existing) { await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() }); return existing._id; }
    return await ctx.db.insert('sourceImports', { ...args, sourceApp: 'trailer-feed', createdAt: Date.now(), updatedAt: Date.now() });
  },
});

export const backfillVersionMetadata = internalMutation({ args: {}, handler: async ctx => {
  const profile = await owner(ctx);
  const projects = await ctx.db.query('projects').withIndex('by_creator', q => q.eq('createdBy', profile._id)).collect();
  let migrated = 0;
  for (const project of projects.filter(project => !project.archived)) {
    const records = await ctx.db.query('sourceImports').withIndex('by_project', q => q.eq('projectId', project._id)).collect();
    for (const record of records) {
      const { mediaMappings } = parseSourceImport(record.sourceDocumentsJson, record.mediaMappingsJson);
      const resolved = new Map<typeof mediaMappings[number], Id<'assetVersions'>>();
      for (const mapping of mediaMappings) {
        const assetId = ctx.db.normalizeId('videos', mapping.assetId);
        const asset = assetId && await ctx.db.get(assetId);
        if (!asset || asset.projectId !== project._id) throw new Error('Import destination unavailable');
        // Old imports without a pinned ID are safe only when the asset has one version.
        const versions = await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', asset._id)).collect();
        const version = mapping.versionId ? versions.find(v => v._id === mapping.versionId) : versions.length === 1 ? versions[0] : undefined;
        if (!version) throw new Error('Import version mapping unavailable');
        resolved.set(mapping, version._id);
      }
      const imported = importedMediaMetadata(record.sourceDocumentsJson, record.mediaMappingsJson);
      for (const mapping of mediaMappings.filter(mapping => mapping.kind !== 'shot_grid')) {
        const versionId = resolved.get(mapping)!;
        const version = (await ctx.db.get(versionId))!;
        if (version.creativeMetadata !== undefined) continue;
        const values = imported.find(item => item.assetId === mapping.assetId);
        if (!values) continue;
        const sourceCreatedAt = Date.parse(values.sourceCreatedAt);
        const grid = mediaMappings.find(item => item.sourceArtifactId === mapping.sourceArtifactId && item.kind === 'shot_grid');
        await writeVersionMetadata(ctx, profile._id, versionId, {
          model: values.model, prompt: values.prompt, sourceLabel: values.label,
          notes: values.label ? `Original title: ${values.label}` : '',
          ...(Number.isFinite(sourceCreatedAt) && sourceCreatedAt >= 0 ? { sourceCreatedAt } : {}),
          ...(grid ? { gridImageVersionId: resolved.get(grid)! } : {}), referenceImageVersionIds: [],
        });
        migrated++;
      }
    }
  }
  return { migrated };
} });

export const list = internalQuery({ args: {}, handler: async (ctx) => {
  const profile = await owner(ctx);
  const projects = await ctx.db.query('projects').withIndex('by_creator', q => q.eq('createdBy', profile._id)).collect();
  return (await Promise.all(projects.map(project => ctx.db.query('sourceImports').withIndex('by_project', q => q.eq('projectId', project._id)).collect()))).flat();
} });
