/** Creative fields are version-scoped in live workspaces; fixture adapters remain local. */
export type CustomMetadataField = { id: string; label: string } & (
  | { kind: 'text' | 'date'; value: string }
  | { kind: 'number'; value: number | null }
  | { kind: 'boolean'; value: boolean | null }
);
export type CreativeMetadata = {
  sourceLabel?: string;
  sourceCreatedAt?: number;
  gridImageVersionId?: string;
  referenceImageVersionIds?: string[];
  notes: string;
  prompt: string;
  model: string;
  releaseDate: string;
  releasePlatforms: string[];
  customFields: CustomMetadataField[];
};
export type AssetMetadataPatch = {
  assetClass?: 'VID' | 'IMG' | 'CTX' | 'STB';
  assetCode?: string;
  tags?: string[];
  metadata?: CreativeMetadata;
};
export type VersionImageOption = { versionId: string; label: string; url: string };
export type MetadataSaveState = { busy: boolean; message: string };
export type MetadataGroup = 'essentials' | 'review' | 'file' | 'tags' | 'creative';
export type MetadataField = { id: string; label: string; group: MetadataGroup; value: string | number | boolean | null | undefined; filled?: boolean };
export type MetadataFilter = { group: 'all' | MetadataGroup; presence: 'all' | 'empty' | 'filled'; search: string };

export function normalizeTags(value: readonly string[]): string[] {
  const seen = new Set<string>();
  return value.map(tag => tag.trim().replace(/\s+/g, ' ')).filter(tag => {
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dateValue(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}

export function normalizeCreativeMetadata(value: unknown): CreativeMetadata {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const text = (key: string) => typeof input[key] === 'string' ? input[key] as string : '';
  const ids = new Set<string>();
  const customFields: CustomMetadataField[] = [];
  if (Array.isArray(input.customFields)) for (const field of input.customFields) {
    if (!field || typeof field !== 'object' || typeof field.id !== 'string' || !field.id.trim() || ids.has(field.id) || typeof field.label !== 'string' || !field.label.trim()) continue;
    const base = { id: field.id, label: field.label.trim() };
    if (field.kind === 'text') customFields.push({ ...base, kind: 'text', value: typeof field.value === 'string' ? field.value : '' });
    else if (field.kind === 'date') customFields.push({ ...base, kind: 'date', value: dateValue(field.value) });
    else if (field.kind === 'number') customFields.push({ ...base, kind: 'number', value: typeof field.value === 'number' && Number.isFinite(field.value) ? field.value : null });
    else if (field.kind === 'boolean') customFields.push({ ...base, kind: 'boolean', value: typeof field.value === 'boolean' ? field.value : null });
    else continue;
    ids.add(field.id);
  }
  return {
    sourceLabel: text('sourceLabel'),
    sourceCreatedAt: typeof input.sourceCreatedAt === 'number' && Number.isFinite(input.sourceCreatedAt) ? input.sourceCreatedAt : undefined,
    gridImageVersionId: typeof input.gridImageVersionId === 'string' && input.gridImageVersionId ? input.gridImageVersionId : undefined,
    referenceImageVersionIds: Array.isArray(input.referenceImageVersionIds) ? [...new Set(input.referenceImageVersionIds.filter((id): id is string => typeof id === 'string' && !!id))] : [],
    notes: text('notes'), prompt: text('prompt'), model: text('model'), releaseDate: dateValue(input.releaseDate),
    releasePlatforms: normalizeTags(Array.isArray(input.releasePlatforms) ? input.releasePlatforms.filter((item): item is string => typeof item === 'string') : []),
    customFields
  };
}

export function filterMetadataFields<T extends MetadataField>(fields: readonly T[], filter: MetadataFilter): T[] {
  const query = filter.search.trim().toLocaleLowerCase();
  return fields.filter(field => {
    if (filter.group !== 'all' && field.group !== filter.group) return false;
    if (query && !field.label.toLocaleLowerCase().includes(query)) return false;
    const filled = field.filled ?? (field.value !== null && field.value !== undefined && (typeof field.value !== 'string' || field.value.trim().length > 0));
    return filter.presence === 'all' || (filter.presence === 'filled' ? filled : !filled);
  });
}
