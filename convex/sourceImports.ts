import { parseSourceImport, importedMediaMetadata } from './lib/sourceImport';
import { writeVersionMetadata } from './lib/versionMetadata';
import { v, ConvexError } from 'convex/values';
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

export const backfillVersionMetadata = internalMutation({
  args: { importId: v.id('sourceImports'), offset: v.optional(v.number()) },
  handler: async (ctx, { importId, offset = 0 }) => {
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid import offset');
    const profile = await owner(ctx);
    const record = await ctx.db.get(importId);
    const project = record && await ctx.db.get(record.projectId);
    if (!record || !project || project.archived || project.createdBy !== profile._id) throw new Error('Import destination unavailable');
    let parsed: ReturnType<typeof parseSourceImport>;
    try { parsed = parseSourceImport(record.sourceDocumentsJson, record.mediaMappingsJson); }
    catch { return { migrated: 0, skipped: 0, nextOffset: null, failures: [{ sourceArtifactId: '', code: 'INVALID_IMPORT' }] }; }
    const { mediaMappings } = parsed;
    const rows = mediaMappings.filter(mapping => mapping.kind !== 'shot_grid');
    const page = rows.slice(offset, offset + 10);
    const imported = importedMediaMetadata(record.sourceDocumentsJson, record.mediaMappingsJson);
    const failures: { sourceArtifactId: string; code: string }[] = [];
    let migrated = 0, skipped = 0;
    async function resolve(mapping: typeof mediaMappings[number]) {
      const assetId = ctx.db.normalizeId('videos', mapping.assetId);
      const asset = assetId && await ctx.db.get(assetId);
      if (!asset || asset.projectId !== project!._id) return null;
      if (mapping.versionId) {
        const versionId = ctx.db.normalizeId('assetVersions', mapping.versionId);
        const version = versionId && await ctx.db.get(versionId);
        return version && version.assetId === asset._id ? version : null;
      }
      // Never guess a legacy version after the asset has more than one.
      const versions = await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', asset._id)).take(2);
      return versions.length === 1 ? versions[0] : null;
    }
    for (const mapping of page) {
      const version = await resolve(mapping);
      if (!version) { failures.push({ sourceArtifactId: mapping.sourceArtifactId, code: 'VERSION_MAPPING_UNAVAILABLE' }); continue; }
      if (version.creativeMetadata !== undefined) { skipped++; continue; }
      const values = imported.find(item => item.assetId === mapping.assetId && item.sourceArtifactId === mapping.sourceArtifactId && item.versionId === mapping.versionId);
      if (!values) { failures.push({ sourceArtifactId: mapping.sourceArtifactId, code: 'SOURCE_ARTIFACT_UNAVAILABLE' }); continue; }
      const grids = mediaMappings.filter(item => item.sourceArtifactId === mapping.sourceArtifactId && item.kind === 'shot_grid');
      if (grids.length > 1) { failures.push({ sourceArtifactId: mapping.sourceArtifactId, code: 'GRID_MAPPING_AMBIGUOUS' }); continue; }
      const grid = grids.length ? await resolve(grids[0]) : null;
      if (grids.length && !grid) { failures.push({ sourceArtifactId: mapping.sourceArtifactId, code: 'GRID_MAPPING_UNAVAILABLE' }); continue; }
      const sourceCreatedAt = Date.parse(values.sourceCreatedAt);
      try {
        await writeVersionMetadata(ctx, profile._id, version._id, {
          model: values.model, prompt: values.prompt, sourceLabel: values.label,
          notes: values.label ? 'Original title: ' + values.label : '',
          ...(Number.isFinite(sourceCreatedAt) && sourceCreatedAt >= 0 ? { sourceCreatedAt } : {}),
          ...(grid ? { gridImageVersionId: grid._id } : {}), referenceImageVersionIds: [],
        });
        migrated++;
      } catch (cause) {
        if (!(cause instanceof ConvexError) || !cause.data || typeof cause.data !== 'object' || !('code' in cause.data) || !['INVALID_VERSION_METADATA', 'IMAGE_REFERENCE_UNAVAILABLE', 'VERSION_UNAVAILABLE'].includes(String(cause.data.code))) throw cause;
        failures.push({ sourceArtifactId: mapping.sourceArtifactId, code: String(cause.data.code) });
      }
    }
    const next = offset + page.length;
    return { migrated, skipped, nextOffset: next < rows.length ? next : null, failures };
  },
});

export const list = internalQuery({ args: {}, handler: async (ctx) => {
  const profile = await owner(ctx);
  const projects = await ctx.db.query('projects').withIndex('by_creator', q => q.eq('createdBy', profile._id)).collect();
  return (await Promise.all(projects.map(project => ctx.db.query('sourceImports').withIndex('by_project', q => q.eq('projectId', project._id)).collect()))).flat();
} });
