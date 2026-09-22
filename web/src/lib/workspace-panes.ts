export type PaneSizes = [number, number, number];
export const DEFAULT_PANE_SIZES: PaneSizes = [27, 43, 30];
const MINIMUMS = [220, 320, 240] as const;

export function paneMinimums(width: number): PaneSizes {
  const available = Math.max(780, Number.isFinite(width) ? width : 780);
  return MINIMUMS.map(value => value / available * 100) as PaneSizes;
}

/** Width excludes the two divider tracks. */
export function normalizePaneSizes(value: unknown, width: number): PaneSizes {
  const input = Array.isArray(value) && value.length === 3 && value.every(n => typeof n === 'number' && Number.isFinite(n) && n > 0)
    ? value as PaneSizes : DEFAULT_PANE_SIZES;
  const total = input.reduce((a, b) => a + b, 0);
  const desired = input.map(n => n / total * 100);
  const minimums = paneMinimums(width);
  if (desired.every((n, i) => n >= minimums[i])) return desired as PaneSizes;
  const remaining = 100 - minimums.reduce((a, b) => a + b, 0);
  const extra = desired.map((n, i) => Math.max(0, n - minimums[i]));
  const extraTotal = extra.reduce((a, b) => a + b, 0);
  return minimums.map((n, i) => n + (extraTotal ? extra[i] / extraTotal * remaining : remaining / 3)) as PaneSizes;
}

export function resizePanePair(value: PaneSizes, divider: 0 | 1, targetPercent: number, width: number): PaneSizes {
  const sizes = normalizePaneSizes(value, width);
  if (!Number.isFinite(targetPercent)) return sizes;
  const min = paneMinimums(width);
  const combined = sizes[divider] + sizes[divider + 1];
  const first = Math.max(min[divider], Math.min(combined - min[divider + 1], targetPercent));
  sizes[divider] = first;
  sizes[divider + 1] = combined - first;
  return sizes;
}

/** Separate two-pane proportions leave saved three-pane preferences untouched. */
export function twoPaneSizes(explorerPercent: number, width: number): PaneSizes {
  const available = Math.max(540, Number.isFinite(width) ? width : 540);
  const first = Math.max(220 / available * 100, Math.min(100 - 320 / available * 100, Number.isFinite(explorerPercent) ? explorerPercent : 40));
  return [first, 100 - first, 0];
}
