import { v, ConvexError, type Infer, type Validator } from 'convex/values';
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

/** Validate JSON against the persisted validator so shape errors have a public error code.
 * Only creativeMetadata's current kinds are supported. Adding another validator kind
 * requires extending this walk and its boundary tests; unsupported kinds fail closed.
 * Convex literal validators contain primitive values, so strict equality is intended.
 */
export function parseVersionMetadata(ctx: MutationCtx, input: unknown): VersionCreativeMetadata {
  function matches(rule: Validator<unknown, 'required' | 'optional', string>, value: unknown): boolean {
    if (value === undefined) return rule.isOptional === 'optional';
    switch (rule.kind) {
      case 'string': return typeof value === 'string';
      case 'float64': return typeof value === 'number' && Number.isFinite(value);
      case 'boolean': return typeof value === 'boolean';
      case 'null': return value === null;
      case 'literal': return value === rule.value;
      case 'id': return rule.tableName === 'assetVersions' && typeof value === 'string' && ctx.db.normalizeId('assetVersions', value) !== null;
      case 'array': return Array.isArray(value) && value.every(item => matches(rule.element, item));
      case 'union': return rule.members.some(option => matches(option, value));
      case 'object': {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const fields = value as Record<string, unknown>;
        return Object.keys(fields).every(key => Object.prototype.hasOwnProperty.call(rule.fields, key)) &&
          Object.entries(rule.fields).every(([key, field]) => matches(field, fields[key]));
      }
      default: throw new Error('Unsupported creative metadata validator');
    }
  }
  if (!matches(creativeMetadata, input)) throw new ConvexError({ code: 'INVALID_VERSION_METADATA', message: 'Invalid creative metadata' });
  return input as VersionCreativeMetadata;
}

function validDate(value: string | undefined) {
  // Empty dates are the editable cleared state, including required custom date values.
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function invalidMetadata(field: string): never {
  throw new ConvexError({ code: 'INVALID_VERSION_METADATA', field, message: `Invalid creative metadata: ${field}` });
}
function checkLength(field: string, length: number, maximum: number) {
  if (length > maximum) invalidMetadata(field);
}

export async function writeVersionMetadata(ctx: MutationCtx, ownerId: Id<'appUsers'>,
  versionId: Id<'assetVersions'>, metadata: VersionCreativeMetadata, expectedUpdatedAt?: number | null) {
  const version = await ctx.db.get(versionId);
  const asset = version && await ctx.db.get(version.assetId);
  const project = asset && await ctx.db.get(asset.projectId);
  if (!version || !asset || !project || project.archived || project.createdBy !== ownerId) throw new ConvexError({ code: 'VERSION_UNAVAILABLE', message: 'Version unavailable' });
  if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== (version.metadataUpdatedAt ?? null)) throw new ConvexError({ code: 'METADATA_CONFLICT', message: 'Metadata changed. Reload the version before saving.' });
  checkLength('model', metadata.model.length, 200);
  checkLength('prompt', metadata.prompt.length, 20000);
  checkLength('sourceLabel', metadata.sourceLabel.length, 500);
  checkLength('notes', metadata.notes?.length ?? 0, 20000);
  checkLength('referenceImageVersionIds', metadata.referenceImageVersionIds.length, 20);
  checkLength('releasePlatforms', metadata.releasePlatforms?.length ?? 0, 20);
  for (const platform of metadata.releasePlatforms ?? []) checkLength('releasePlatforms', platform.length, 100);
  if (!validDate(metadata.releaseDate)) invalidMetadata('releaseDate');
  if (metadata.sourceCreatedAt !== undefined && (!Number.isSafeInteger(metadata.sourceCreatedAt) || metadata.sourceCreatedAt < 0 || metadata.sourceCreatedAt > 8640000000000000)) invalidMetadata('sourceCreatedAt');
  const customFields = metadata.customFields?.map(field => ({ ...field, id: field.id.trim() }));
  checkLength('customFields', customFields?.length ?? 0, 30);
  for (const field of customFields ?? []) {
    if (!field.id || !field.label.trim()) invalidMetadata('customFields');
    checkLength('customFields.id', field.id.length, 100);
    checkLength('customFields.label', field.label.length, 200);
    if (typeof field.value === 'string') checkLength('customFields.value', field.value.length, 20000);
    if (typeof field.value === 'number' && !Number.isFinite(field.value)) invalidMetadata('customFields.value');
    if (field.kind === 'date' && !validDate(field.value)) invalidMetadata('customFields.date');
  }
  if (new Set(customFields?.map(field => field.id)).size !== (customFields?.length ?? 0)) invalidMetadata('customFields.id');
  const references = [...new Set([...(metadata.gridImageVersionId ? [metadata.gridImageVersionId] : []), ...metadata.referenceImageVersionIds])];
  const versions = await Promise.all(references.map(id => ctx.db.get(id)));
  const imageIds = [...new Set(versions.flatMap(reference => reference ? [reference.assetId] : []))];
  const images = new Map(await Promise.all(imageIds.map(async id => [id, await ctx.db.get(id)] as const)));
  for (const reference of versions) {
    const image = reference && images.get(reference.assetId);
    const still = image && image.assetClass !== 'VID' && reference?.mimeType.startsWith('image/');
    if (!reference || !image || image.projectId !== project._id || !still) throw new ConvexError({ code: 'IMAGE_REFERENCE_UNAVAILABLE', message: 'Image reference unavailable' });
  }
  const updatedAt = Math.max(Date.now(), (version.metadataUpdatedAt ?? 0) + 1);
  await ctx.db.patch(versionId, { creativeMetadata: { ...metadata, ...(customFields ? { customFields } : {}), referenceImageVersionIds: [...new Set(metadata.referenceImageVersionIds)] }, metadataUpdatedAt: updatedAt });
  await ctx.db.patch(asset._id, { updatedAt: Date.now() });
  return { updatedAt };
}
