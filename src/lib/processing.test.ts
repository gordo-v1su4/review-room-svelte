import { expect, test } from 'bun:test';
import { acceptsProcessingUpdate, type ProcessingUpdate } from './processing';

const pick = (versionNumber: number, updatedAt: number): ProcessingUpdate => ({
  assetId: 'shot', versionId: `v${versionNumber}`, versionNumber, updatedAt,
  ready: true, hasPoster: false,
});

test('newer saved picks can move backwards between takes while stale polls stay rejected', () => {
  expect(acceptsProcessingUpdate(pick(9, 10), pick(3, 11))).toBe(true);
  expect(acceptsProcessingUpdate(pick(9, 10), pick(4, 12))).toBe(true);
  expect(acceptsProcessingUpdate(pick(4, 12), pick(9, 10))).toBe(false);
  expect(acceptsProcessingUpdate(pick(9, 10), pick(3, 10))).toBe(false);
  expect(acceptsProcessingUpdate(pick(3, 10), pick(9, 10))).toBe(true);
});
