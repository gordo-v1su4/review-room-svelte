export type ProcessingJob = {
  _id: string; assetId: string; versionId: string; attempt: number;
  status: 'queued' | 'running' | 'ready' | 'error'; stage: string;
  runId?: string; createdAt: number; updatedAt: number;
};
export type ProcessingUpdate = {
  assetId: string; versionId: string | null; versionNumber: number; updatedAt: number;
  ready: boolean; hasPoster: boolean;
  duration?: number; width?: number; height?: number; job?: ProcessingJob;
};

/** Bounded batches, no overlapping polls, and recoverable transport failures. */
export function observeProcessing(assetIds: () => readonly string[], apply: (updates: ProcessingUpdate[]) => void) {
  let stopped = false, generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  async function poll() {
    const current = ++generation;
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const ids = [...new Set(assetIds())];
      for (let offset = 0; offset < ids.length; offset += 50) {
        const response = await fetch('/api/owner-processing', {
          method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ assetIds: ids.slice(offset, offset + 50) })
        });
        if (!response.ok) throw new Error('Processing observation unavailable');
        const updates: ProcessingUpdate[] = await response.json();
        if (stopped || current !== generation || controller.signal.aborted) return;
        const stillPresent = new Set(assetIds());
        apply(updates.filter(update => stillPresent.has(update.assetId)));
      }
    } catch { /* Retain the usable workspace; the next poll can recover. */ }
    finally {
      clearTimeout(timeout);
      if (!stopped && current === generation) timer = setTimeout(poll, 3000);
    }
  }
  function refresh() {
    if (stopped) return;
    generation++; clearTimeout(timer); request?.abort();
    void poll();
  }
  refresh();
  return { refresh, stop() { stopped = true; generation++; clearTimeout(timer); request?.abort(); } };
}

export function processingSource(update: ProcessingUpdate) {
  return update.ready ? `/api/owner-media/${update.assetId}?version=${encodeURIComponent(update.versionId ?? '')}&attempt=${update.job?.attempt ?? 0}` : '';
}
export function processingAvailability(update: ProcessingUpdate): 'queued' | 'running' | 'error' | 'ready' {
  return update.ready ? 'ready' : update.job?.status === 'error' ? 'error' : update.job?.status === 'running' ? 'running' : 'queued';
}
export function processingPoster(update: ProcessingUpdate) {
  return update.ready && update.hasPoster
    ? `/api/owner-poster/${update.assetId}?version=${encodeURIComponent(update.versionId ?? '')}&attempt=${update.job?.attempt ?? 0}`
    : undefined;
}
