import { normalizeCreativeMetadata, type NormalizedCreativeMetadata } from './asset-metadata';

export type ImportedVersionMetadata = {
  assetId: string;
  versionId?: string;
  label: string;
  prompt: string;
  model: string;
  sourceCreatedAt: string;
};

export function importedVersionMetadataFallback(
  imports: readonly ImportedVersionMetadata[],
  assetId: string,
  versionId: string | null | undefined,
  versions: readonly { id: string; assetId: string }[] = [],
): NormalizedCreativeMetadata | undefined {
  if (!versionId) return undefined;
  let imported = imports.find(item => item.assetId === assetId && item.versionId === versionId);
  if (!imported) {
    const assetVersions = versions.filter(item => item.assetId === assetId);
    const legacyImports = imports.filter(item => item.assetId === assetId && !item.versionId);
    if (assetVersions.length === 1 && assetVersions[0].id === versionId && legacyImports.length === 1) imported = legacyImports[0];
  }
  if (!imported) return undefined;
  const sourceCreatedAt = Date.parse(imported.sourceCreatedAt);
  return normalizeCreativeMetadata({
    notes: imported.label ? `Original title: ${imported.label}` : '',
    prompt: imported.prompt,
    model: imported.model,
    sourceLabel: imported.label,
    ...(Number.isFinite(sourceCreatedAt) && sourceCreatedAt >= 0 ? { sourceCreatedAt } : {}),
    releaseDate: '',
    releasePlatforms: [],
    customFields: [],
  });
}

export function displayVersionMetadata(
  durable: unknown,
  imports: readonly ImportedVersionMetadata[],
  assetId: string,
  versionId: string | null | undefined,
  versions: readonly { id: string; assetId: string }[] = [],
): NormalizedCreativeMetadata | undefined {
  if (durable !== null && durable !== undefined) return normalizeCreativeMetadata(durable);
  return importedVersionMetadataFallback(imports, assetId, versionId, versions);
}

export function versionedSourceFile(sourceFile: Pick<File, 'name' | 'type'>, mimeType: string): Pick<File, 'name' | 'type'> {
  return { ...sourceFile, type: mimeType };
}
