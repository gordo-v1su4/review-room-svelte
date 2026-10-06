import { v, type Infer } from 'convex/values';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

export const creativeMetadata = v.object({
  model: v.string(),
  prompt: v.string(),
  sourceLabel: v.string(),
  sourceCreatedAt: v.optional(v.number()),
  gridImageVersionId: v.optional(v.id('assetVersions')),
  referenceImageVersionIds: v.array(v.id('assetVersions')),
  notes: v.optional(v.string()),
  releaseDate: v.optional(v.string()),
  releasePlatforms: v.optional(v.array(v.string())),
  customFields: v.optional(v.array(v.union(
    v.object({ id: v.string(), label: v.string(), kind: v.union(v.literal('text'), v.literal('date')), value: v.string() }),
    v.object({ id: v.string(), label: v.string(), kind: v.literal('number'), value: v.union(v.number(), v.null()) }),
    v.object({ id: v.string(), label: v.string(), kind: v.literal('boolean'), value: v.union(v.boolean(), v.null()) }),
  ))),
});
export type VersionCreativeMetadata = Infer<typeof creativeMetadata>;

function validDate(value: string | undefined) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function writeVersionMetadata(ctx: MutationCtx, ownerId: Id<'appUsers'>,
  versionId: Id<'assetVersions'>, metadata: VersionCreativeMetadata, expectedUpdatedAt?: number | null) {
  const version = await ctx.db.get(versionId);
  const asset = version && await ctx.db.get(version.assetId);
  const project = asset && await ctx.db.get(asset.projectId);
  if (!version || !asset || !project || project.archived || project.createdBy !== ownerId) throw new Error('Version unavailable');
  if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== (version.metadataUpdatedAt ?? null)) throw new Error('Metadata changed. Reload the version before saving.');
  if (metadata.model.length > 200 || metadata.prompt.length > 20000 || metadata.sourceLabel.length > 500 ||
    metadata.referenceImageVersionIds.length > 20 || (metadata.notes?.length ?? 0) > 20000 ||
    (metadata.releasePlatforms?.length ?? 0) > 20 || metadata.releasePlatforms?.some(item => item.length > 100) ||
    (metadata.customFields?.length ?? 0) > 30 || metadata.customFields?.some(field => !field.id.trim() || field.id.length > 100 || !field.label.trim() || field.label.length > 200 || (typeof field.value === 'string' && field.value.length > 20000) || (typeof field.value === 'number' && !Number.isFinite(field.value))) ||
    !validDate(metadata.releaseDate) || metadata.customFields?.some(field => field.kind === 'date' && !validDate(field.value)) ||
    new Set(metadata.customFields?.map(field => field.id.trim())).size !== (metadata.customFields?.length ?? 0) ||
    (metadata.sourceCreatedAt !== undefined && (!Number.isSafeInteger(metadata.sourceCreatedAt) || metadata.sourceCreatedAt < 0 || metadata.sourceCreatedAt > 8640000000000000))) throw new Error('Invalid creative metadata');
  const references = [...new Set([...(metadata.gridImageVersionId ? [metadata.gridImageVersionId] : []), ...metadata.referenceImageVersionIds])];
  for (const id of references) {
    const reference = await ctx.db.get(id);
    const image = reference && await ctx.db.get(reference.assetId);
    const still = image && image.assetClass !== 'VID' && reference?.mimeType.startsWith('image/');
    if (!reference || !image || image.projectId !== project._id || !still) throw new Error('Image reference unavailable');
  }
  const updatedAt = Math.max(Date.now(), (version.metadataUpdatedAt ?? 0) + 1);
  await ctx.db.patch(versionId, { creativeMetadata: { ...metadata, referenceImageVersionIds: [...new Set(metadata.referenceImageVersionIds)] }, metadataUpdatedAt: updatedAt });
  await ctx.db.patch(asset._id, { updatedAt: Date.now() });
  return { updatedAt };
}
