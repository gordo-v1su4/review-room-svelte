import { expect, test } from 'bun:test';
import { nextReviewAsset } from './review-order';

test('ordered review follows the visible collection and wraps after its last asset', () => {
  const visible = ['first', 'second', 'third'];
  expect(nextReviewAsset(visible, 'first')).toBe('second');
  expect(nextReviewAsset(visible, 'third')).toBe('first');
  expect(visible).toEqual(['first', 'second', 'third']);
});

test('ordered review honors the latest filtering and sorting without adding hidden assets', () => {
  expect(nextReviewAsset(['first', 'third'], 'first')).toBe('third');
  expect(nextReviewAsset(['third', 'first', 'second'], 'first')).toBe('second');
  expect(nextReviewAsset(['first', 'third'], 'second')).toBeNull();
});

test('empty and single-asset collections do not silently become clip loops', () => {
  expect(nextReviewAsset([], 'first')).toBeNull();
  expect(nextReviewAsset(['first'], 'first')).toBeNull();
  expect(nextReviewAsset(['first', 'first'], 'first')).toBeNull();
});
