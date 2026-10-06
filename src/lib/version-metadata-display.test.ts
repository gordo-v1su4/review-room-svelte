import { describe, expect, test } from 'bun:test';
import { displayVersionMetadata, importedVersionMetadataFallback, versionedSourceFile, type ImportedVersionMetadata } from './version-metadata-display';

const imported: ImportedVersionMetadata[] = [
  { assetId: 'asset-1', versionId: 'version-1', label: 'Imported title', prompt: 'Imported prompt', model: 'Imported model', sourceCreatedAt: '2026-10-01T00:00:00Z' },
  { assetId: 'asset-1', versionId: 'version-2', label: 'Other version', prompt: 'Other prompt', model: 'Other model', sourceCreatedAt: '2026-10-02T00:00:00Z' },
  { assetId: 'asset-2', versionId: 'version-1', label: 'Other asset', prompt: 'Wrong asset prompt', model: 'Wrong asset model', sourceCreatedAt: '2026-10-03T00:00:00Z' },
  { assetId: 'asset-1', label: 'Legacy mapping', prompt: 'Legacy prompt', model: 'Legacy model', sourceCreatedAt: '2026-10-04T00:00:00Z' },
];

describe('version metadata display fallbacks', () => {
  test('builds an exact-version imported fallback with source identity fields', () => {
    expect(importedVersionMetadataFallback(imported, 'asset-1', 'version-1')).toEqual({
      notes: 'Original title: Imported title',
      prompt: 'Imported prompt',
      model: 'Imported model',
      sourceLabel: 'Imported title',
      sourceCreatedAt: Date.parse('2026-10-01T00:00:00Z'),
      referenceImageVersionIds: [],
      releaseDate: '',
      releasePlatforms: [],
      customFields: [],
    });
  });

  test('does not bleed imported metadata across versions, assets, or legacy unversioned mappings', () => {
    expect(importedVersionMetadataFallback(imported, 'asset-1', 'version-2')?.prompt).toBe('Other prompt');
    expect(importedVersionMetadataFallback(imported, 'asset-1', 'missing')).toBeUndefined();
    expect(importedVersionMetadataFallback(imported, 'asset-2', 'version-2')).toBeUndefined();
    expect(importedVersionMetadataFallback(imported, 'asset-1', undefined)).toBeUndefined();
  });

  test('uses imported fallback only when durable version metadata is absent', () => {
    expect(displayVersionMetadata(null, imported, 'asset-1', 'version-1')?.prompt).toBe('Imported prompt');
    expect(displayVersionMetadata(undefined, imported, 'asset-1', 'version-1')?.model).toBe('Imported model');
    expect(displayVersionMetadata({ model: '', prompt: '', sourceLabel: '', referenceImageVersionIds: [] }, imported, 'asset-1', 'version-1')).toEqual({
      model: '',
      prompt: '',
      sourceLabel: '',
      referenceImageVersionIds: [],
      notes: '',
      releaseDate: '',
      releasePlatforms: [],
      customFields: [],
    });
  });

  test('keeps the known filename when a selected version changes MIME type', () => {
    expect(versionedSourceFile({ name: 'known-original.mov', type: 'video/quicktime' }, 'video/mp4')).toEqual({
      name: 'known-original.mov',
      type: 'video/mp4',
    });
  });
  test('resolves legacy imports only for a sole version and a sole mapping', () => {
    const legacy = imported.filter(item => !item.versionId);
    expect(displayVersionMetadata(null, legacy, 'asset-1', 'version-1', [{ id: 'version-1', assetId: 'asset-1' }])?.prompt).toBe('Legacy prompt');
    expect(displayVersionMetadata(null, legacy, 'asset-1', 'version-1', [{ id: 'version-1', assetId: 'asset-1' }, { id: 'version-2', assetId: 'asset-1' }])).toBeUndefined();
    expect(displayVersionMetadata(null, [...legacy, { ...legacy[0], prompt: 'Ambiguous' }], 'asset-1', 'version-1', [{ id: 'version-1', assetId: 'asset-1' }])).toBeUndefined();
  });
});
