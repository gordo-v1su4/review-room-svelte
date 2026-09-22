import { expect, test } from 'bun:test';
import { resizePanePair, normalizePaneSizes } from './workspace-panes';

test('dragging a divider preserves the third pane and honors pixel minimums', () => {
  const sizes = resizePanePair([27, 43, 30], 0, 70, 1000);
  expect(sizes).toEqual([38, 32, 30]);
  expect(resizePanePair(sizes, 0, -50, 1000)).toEqual([22, 48, 30]);
  expect(resizePanePair([27, 43, 30], 1, 90, 1000)).toEqual([27, 49, 24]);
});

test('restored sizes reject corrupt data and fit a narrower desktop without overflow', () => {
  expect(normalizePaneSizes([NaN, 50, 50], 1000)).toEqual([27, 43, 30]);
  const sizes = normalizePaneSizes([70, 10, 20], 800);
  expect(sizes[0]).toBeGreaterThanOrEqual(27.5);
  expect(sizes[1]).toBeGreaterThanOrEqual(40);
  expect(sizes[2]).toBeGreaterThanOrEqual(30);
  expect(sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
});

test('a collapsed inspector gives two panes independent minimums without changing three-pane preferences', async () => {
  const { twoPaneSizes } = await import('./workspace-panes');
  expect(twoPaneSizes(90, 1000)).toEqual([68, 32, 0]);
  expect(twoPaneSizes(5, 1000)).toEqual([22, 78, 0]);
  expect(twoPaneSizes(40, 600)).toEqual([40, 60, 0]);
});
