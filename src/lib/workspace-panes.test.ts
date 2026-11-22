import { expect, test } from 'bun:test';
import { resizePanePair, normalizePaneSizes } from './workspace-panes';

test('dragging a divider preserves the third pane and honors pixel minimums', () => {
  const sizes = resizePanePair([25, 55, 20], 0, 90, 1200);
  expect(sizes[0]).toBeCloseTo(25);
  expect(sizes[1]).toBeCloseTo(55);
  expect(sizes[2]).toBe(20);
  const left = resizePanePair(sizes, 0, -50, 1200);
  expect(left[0] / 100 * 1200).toBeCloseTo(220);
  expect(left[1] / 100 * 1200).toBeGreaterThanOrEqual(660);
  expect(left[2]).toBe(20);
  const right = resizePanePair(sizes, 1, 90, 1200);
  expect(right[1] / 100 * 1200).toBeGreaterThanOrEqual(660);
  expect(right[2] / 100 * 1200).toBeCloseTo(240);
});

test('restored sizes reject corrupt data and fit a narrower desktop without overflow', () => {
  const restored = normalizePaneSizes([NaN, 50, 50], 1200);
  expect(restored.every(Number.isFinite)).toBe(true);
  const sizes = normalizePaneSizes([70, 10, 20], 1120);
  expect(sizes[0] / 100 * 1120).toBeGreaterThanOrEqual(220);
  expect(sizes[1] / 100 * 1120).toBeGreaterThanOrEqual(660);
  expect(sizes[2] / 100 * 1120).toBeGreaterThanOrEqual(240);
  expect(sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
});

test('a collapsed inspector gives two panes independent minimums without changing three-pane preferences', async () => {
  const { twoPaneSizes } = await import('./workspace-panes');
  expect(twoPaneSizes(90, 1000)).toEqual([34, 66, 0]);
  expect(twoPaneSizes(5, 1000)).toEqual([22, 78, 0]);
  expect(twoPaneSizes(40, 880)).toEqual([25, 75, 0]);
});
