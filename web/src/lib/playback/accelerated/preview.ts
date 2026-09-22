import type { PreviewInfo, PreviewRequest, PreviewResponse } from './protocol';

export type ScrubPreviewFrame = { bitmap: ImageBitmap; time: number; decodeMs: number; requestMs: number };
/** Separate from native audio/playback. onFrame receives ownership and must close bitmap. */
export function createScrubPreview(source: Blob, callbacks: {
  onFrame(frame: ScrubPreviewFrame): void;
  onFallback(reason: string): void;
  onReady?(info: PreviewInfo): void;
}) {
  let worker: Worker | undefined;
  let disposed = false;
  let ready = false;
  let latest = 0;
  let intent: { id: number; time: number; started: number } | undefined;
  let inFlight: typeof intent;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const send = (message: PreviewRequest) => worker?.postMessage(message);
  const fallback = (reason: string) => {
    if (disposed) return;
    disposed = true; clearTimeout(timeout); worker?.terminate(); worker = undefined;
    callbacks.onFallback(reason);
  };
  function armTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(() => fallback('Worker preview timed out; native playback remains available.'), 10_000);
  }
  function dispatch() {
    if (disposed || !ready || inFlight || !intent) return;
    inFlight = intent; intent = undefined;
    send({ type: 'seek', id: inFlight.id, time: inFlight.time }); armTimeout();
  }
  try {
    if (typeof Worker === 'undefined') throw new Error('Workers are unavailable.');
    worker = new Worker(new URL('./preview.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<PreviewResponse>) => {
      if (data.type === 'frame') {
        if (disposed || data.id !== inFlight?.id) { data.bitmap.close(); return; }
        clearTimeout(timeout);
        const requestMs = performance.now() - inFlight.started;
        inFlight = undefined;
        try { callbacks.onFrame({ bitmap: data.bitmap, time: data.time, decodeMs: data.decodeMs, requestMs }); }
        catch { data.bitmap.close(); fallback('Preview rendering failed.'); }
        dispatch();
      } else if (data.type === 'ready' && !disposed) {
        ready = true; clearTimeout(timeout); callbacks.onReady?.(data.info);
        dispatch();
      } else if (data.type === 'fallback') fallback(data.reason);
    };
    worker.onerror = () => fallback('Worker preview failed; native playback remains available.');
    worker.onmessageerror = () => fallback('Preview frame transfer failed.');
    send({ type: 'init', source }); armTimeout();
  } catch (error) {
    // Let callers finish assigning their session handle before fallback notification.
    queueMicrotask(() => fallback(error instanceof Error ? error.message : 'Preview unavailable.'));
  }
  return {
    request(time: number) {
      if (disposed || !Number.isFinite(time)) return;
      intent = { id: ++latest, time: Math.max(0, time), started: performance.now() };
      dispatch();
    },
    cancel() { latest++; intent = undefined; inFlight = undefined; if (ready) { clearTimeout(timeout); send({ type: 'cancel' }); } },
    dispose() { disposed = true; latest++; intent = undefined; inFlight = undefined; clearTimeout(timeout); worker?.terminate(); worker = undefined; },
  };
}
