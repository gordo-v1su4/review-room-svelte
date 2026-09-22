/** A stable shortlist snapshot; newly shortlisted assets join on the next run. */
export interface ShortlistPreview {
  readonly ids: readonly string[];
  readonly currentId: string;
  readonly step: number;
}

export function startShortlistPreview(ids: readonly string[]): ShortlistPreview | null {
  return ids.length ? { ids: [...ids], currentId: ids[0], step: 0 } : null;
}

/** Removed/archived assets are skipped without changing the original playback order. */
export function advanceShortlistPreview(run: ShortlistPreview, eligibleIds: readonly string[], loop: boolean): ShortlistPreview | null {
  const eligible = new Set(eligibleIds);
  const index = run.ids.indexOf(run.currentId);
  const currentId = run.ids.slice(index + 1).find(id => eligible.has(id))
    ?? (loop ? run.ids.find(id => eligible.has(id)) : undefined);
  return currentId ? { ...run, currentId, step: run.step + 1 } : null;
}
