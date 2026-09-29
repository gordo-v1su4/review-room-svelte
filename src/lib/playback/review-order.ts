export type ReviewPlaybackMode = 'once' | 'loop' | 'order';

/** Follow the current filtered/sorted collection; a removed selection cannot advance it. */
export function nextReviewAsset(visibleIds: readonly string[], currentId: string): string | null {
  const ids = [...new Set(visibleIds)];
  const index = ids.indexOf(currentId);
  return index >= 0 && ids.length > 1 ? ids[(index + 1) % ids.length] : null;
}
