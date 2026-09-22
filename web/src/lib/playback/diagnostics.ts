export type PlaybackMetrics = Readonly<{
  adapter: 'native';
  firstLoadedFrameMs: number | null;
  lastSeekMs: number | null;
  totalFrames: number | null;
  droppedFrames: number | null;
}>;
interface DiagnosticMedia extends EventTarget {
  currentTime: number;
  seeking: boolean;
  readyState: number;
  getVideoPlaybackQuality?(): { totalVideoFrames: number; droppedVideoFrames: number };
}
const empty = (): PlaybackMetrics => ({ adapter: 'native', firstLoadedFrameMs: null, lastSeekMs: null, totalFrames: null, droppedFrames: null });

/** Measures native media events, not compositor presentation or accelerated decoding. */
export function observeNativePlayback(media: DiagnosticMedia, publish: (metrics: PlaybackMetrics) => void, now = () => performance.now()) {
  let metrics = empty();
  let started = now();
  let pending: { time: number; started: number } | undefined;
  let disposed = false;
  const emit = () => { if (!disposed) publish(metrics); };
  function quality() {
    try {
      const value = media.getVideoPlaybackQuality?.();
      if (value) metrics = { ...metrics, totalFrames: value.totalVideoFrames, droppedFrames: value.droppedVideoFrames };
    } catch { /* Unsupported metrics stay unavailable; playback remains independent. */ }
  }
  const listeners: Record<string, EventListener> = {
    loadstart: () => { started = now(); pending = undefined; metrics = empty(); emit(); },
    loadeddata: () => {
      if (metrics.firstLoadedFrameMs === null) metrics = { ...metrics, firstLoadedFrameMs: now() - started };
      quality(); emit();
    },
    seeked: () => {
      if (pending && !media.seeking && media.readyState >= 2 && Math.abs(media.currentTime - pending.time) < 0.05) {
        metrics = { ...metrics, lastSeekMs: now() - pending.started }; pending = undefined;
      }
      quality(); emit();
    },
    timeupdate: () => { quality(); emit(); },
    pause: () => { quality(); emit(); },
    error: () => { pending = undefined; },
  };
  for (const [name, listener] of Object.entries(listeners)) media.addEventListener(name, listener);
  emit();
  return {
    requestSeek(time: number) {
      if (!disposed && Number.isFinite(time)) pending = { time, started: now() };
    },
    dispose() {
      disposed = true; pending = undefined;
      for (const [name, listener] of Object.entries(listeners)) media.removeEventListener(name, listener);
    },
  };
}
