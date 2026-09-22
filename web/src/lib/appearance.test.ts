import { expect, test } from 'bun:test';
import { normalizeAppearance } from './appearance';

test('older appearance preferences retain layout and receive original card info defaults', () => {
  const result = normalizeAppearance({ aspect: 'portrait', fit: 'fit', size: 'large' });
  expect(result.aspect).toBe('portrait');
  expect(result.fit).toBe('fit');
  expect(result.size).toBe('large');
  expect(result.showInfo).toBe(true);
  expect(result.visibleFields).toEqual(['status', 'rating', 'uploadedAt', 'commentCount']);
});

test('field preferences preserve hiding all fields and sanitize duplicate, obsolete and partial ordering', () => {
  const result = normalizeAppearance({ showInfo: false, visibleFields: [], fieldOrder: ['tags', 'obsolete', 'status', 'tags'] });
  expect(result.showInfo).toBe(false);
  expect(result.visibleFields).toEqual([]);
  expect(result.fieldOrder.slice(0, 3)).toEqual(['tags', 'status', 'rating']);
  expect(result.fieldOrder.length).toBe(12);
  expect(normalizeAppearance({ visibleFields: ['filename', 5, 'filename', 'obsolete'] }).visibleFields).toEqual(['filename']);
});

test('original workspace preferences migrate without losing card visibility', () => {
  const result = normalizeAppearance({ gridSize: 'sm', aspectRatio: 'video', thumbnailScale: 'fit', showCardInfo: false, visibleCardFields: ['tags', 'status'] });
  expect(result).toMatchObject({ size: 'small', aspect: 'landscape', fit: 'fit', showInfo: false, visibleFields: ['tags', 'status'] });
  expect(normalizeAppearance(null)).toMatchObject({ size: 'medium', aspect: 'landscape', showInfo: true });
});

test('explicit square stays square while invalid aspect falls back to landscape', () => {
  expect(normalizeAppearance({ aspect: 'square' }).aspect).toBe('square');
  expect(normalizeAppearance({ aspect: 'unknown' }).aspect).toBe('landscape');
});
