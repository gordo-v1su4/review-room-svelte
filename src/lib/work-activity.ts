export type ActivityItem = {
  id: string; kind: 'upload' | 'ingest' | 'transfer'; label: string; project: string;
  projectId?: string; assetId?: string; state: 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  stage: string; progress?: number; updatedAt: number;
};
export type ActivitySnapshot = { items: readonly ActivityItem[]; counts: { active: number; queued: number; failed: number; complete: number }; pulse: number; stale: boolean; truncated: boolean };
export type ActivityFeed = ReturnType<typeof createActivityFeed>;
export const ACTIVITY_CONTEXT = Symbol('review-room-work-activity');

/** A short-lived observation feed, independent of the engines that do the work. */
export function createActivityFeed(clock = Date.now) {
  const items = new Map<string, ActivityItem>();
  const dismissed = new Map<string, number>();
  const listeners = new Set<(state: ActivitySnapshot) => void>();
  let pulse = 0, stale = false, truncated = false;
  function snapshot(): ActivitySnapshot {
    const rows = [...items.values()].sort((a, b) => rank(a) - rank(b) || b.updatedAt - a.updatedAt);
    return { items: rows, counts: {
      active: rows.filter(item => item.state === 'running').length,
      queued: rows.filter(item => item.state === 'queued').length,
      failed: rows.filter(item => item.state === 'failed').length,
      complete: rows.filter(item => item.state === 'complete').length,
    }, pulse, stale, truncated };
  }
  function publish() { for (const listener of listeners) listener(snapshot()); }
  function tick() {
    const finished = [...items.values()].filter(item => item.state === 'complete' || item.state === 'cancelled').sort((a, b) => b.updatedAt - a.updatedAt);
    for (const [index, item] of finished.entries()) if (index >= 5 || clock() - item.updatedAt >= 8000) items.delete(item.id);
    publish();
  }
  function upsert(item: ActivityItem) {
    if ((dismissed.get(item.id) ?? -1) >= item.updatedAt) return;
    const prior = items.get(item.id);
    if (prior && prior.updatedAt > item.updatedAt) return;
    if ((item.state === 'complete' || item.state === 'cancelled') && clock() - item.updatedAt >= 8000) { items.delete(item.id); publish(); return; }
    if ((!prior || prior.state === 'complete' || prior.state === 'cancelled' || prior.state === 'failed') && (item.state === 'running' || item.state === 'queued')) pulse++;
    if (!prior && item.state === 'complete') pulse++; // A real fast receipt may arrive between polls.
    items.set(item.id, { ...item, progress: item.progress === undefined || !Number.isFinite(item.progress) ? undefined : Math.min(100, Math.max(0, item.progress)) });
    tick();
  }
  return {
    snapshot, tick, upsert,
    subscribe(listener: (state: ActivitySnapshot) => void) { listeners.add(listener); listener(snapshot()); return () => { listeners.delete(listener); }; },
    observe(rows: readonly ActivityItem[], limited = false) {
      stale = false; truncated = limited;
      // Missing records are no longer observable (deleted, archived or replaced).
      // Never manufacture a successful completion, or drop work from a limited page.
      if (!limited) {
        const present = new Set(rows.map(row => row.id));
        for (const item of items.values()) if (item.kind !== 'upload' && !present.has(item.id)) items.delete(item.id);
      }
      for (const item of rows) upsert(item); publish();
    },
    clear() { items.clear(); dismissed.clear(); stale = false; truncated = false; publish(); },
    unavailable() { stale = true; publish(); },
    dismiss(id: string) { const item = items.get(id); if (!item || item.state === 'queued' || item.state === 'running') return; dismissed.set(id, item.updatedAt); items.delete(id); publish(); },
    observedIds() { return [...items.values()].filter(item => item.kind !== 'upload').slice(0, 100).map(item => item.id); },
  };
}
function rank(item: ActivityItem) { return item.state === 'running' ? 0 : item.state === 'queued' ? 1 : item.state === 'failed' ? 2 : 3; }
