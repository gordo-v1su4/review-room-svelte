import { describe, expect, test } from 'bun:test';
import { filterMetadataFields, normalizeCreativeMetadata, normalizeTags } from './asset-metadata';

describe('local production metadata', () => {
  test('normalizes tags without duplicating case variants or changing first spelling', () => {
    expect(normalizeTags([' Hero ', 'hero', '', 'Final  cut', 'FINAL CUT'])).toEqual(['Hero', 'Final cut']);
  });
  test('keeps typed values and stable field IDs while rejecting malformed custom fields', () => {
    const metadata = normalizeCreativeMetadata({
      notes: '  Keep intentional spacing  ', releaseDate: '2026-02-30', releasePlatforms: ['Web', 'web'],
      customFields: [
        { id: 'take', label: ' Take ', kind: 'number', value: 0 },
        { id: 'approved', label: 'Approved', kind: 'boolean', value: false },
        { id: 'date', label: 'Shoot date', kind: 'date', value: '2026-09-22' },
        { id: 'take', label: 'Duplicate', kind: 'text', value: 'bad' },
        { id: 'bad', label: 'Bad number', kind: 'number', value: Infinity },
        { id: 'other', label: 'Other', kind: 'object', value: {} }
      ]
    });
    expect(metadata.notes).toBe('  Keep intentional spacing  ');
    expect(metadata.releaseDate).toBe('');
    expect(metadata.releasePlatforms).toEqual(['Web']);
    expect(metadata.customFields).toEqual([
      { id: 'take', label: 'Take', kind: 'number', value: 0 },
      { id: 'approved', label: 'Approved', kind: 'boolean', value: false },
      { id: 'date', label: 'Shoot date', kind: 'date', value: '2026-09-22' },
      { id: 'bad', label: 'Bad number', kind: 'number', value: null }
    ]);
  });
  test('combines group, presence, and label filters, including false and zero filled values', () => {
    const rows = [
      { id: 'take', label: 'Take number', group: 'creative' as const, value: 0 },
      { id: 'approved', label: 'Approved', group: 'creative' as const, value: false },
      { id: 'prompt', label: 'Prompt', group: 'creative' as const, value: ' ' },
      { id: 'filename', label: 'Filename', group: 'file' as const, value: 'take.mp4' }
    ];
    expect(filterMetadataFields(rows, { group: 'creative', presence: 'filled', search: '' }).map(row => row.id)).toEqual(['take', 'approved']);
    expect(filterMetadataFields(rows, { group: 'all', presence: 'all', search: ' TAKE ' }).map(row => row.id)).toEqual(['take']);
    expect(filterMetadataFields(rows, { group: 'creative', presence: 'empty', search: '' }).map(row => row.id)).toEqual(['prompt']);
  });
});
