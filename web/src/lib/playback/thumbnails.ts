/** A real decoded frame. Callers own any object URL they create from `blob`. */
export interface VideoThumbnail {
  blob: Blob;
  width: number;
  height: number;
  duration: number;
  time: number;
}

type Job = {
  start(): void;
  abort(): void;
};

const aborted = () => new DOMException('Thumbnail extraction cancelled.', 'AbortError');

/** Browser-only on extract; construction is safe during SSR. Never uploads the source. */
export function createThumbnailExtractor({ concurrency = 2 }: { concurrency?: number } = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
    throw new RangeError('Thumbnail concurrency must be an integer between 1 and 4.');
  const queued: Job[] = [];
  const active = new Set<Job>();
  let disposed = false;
  function pump() {
    while (!disposed && queued.length && active.size < concurrency) {
      const job = queued.shift()!;
      active.add(job); job.start();
    }
  }
  return {
    extract(file: Blob, { signal }: { signal?: AbortSignal } = {}): Promise<VideoThumbnail> {
      if (disposed || signal?.aborted) return Promise.reject(aborted());
      return new Promise((resolve, reject) => {
        const controller = new AbortController();
        let settled = false;
        const finish = (value?: VideoThumbnail, error?: unknown) => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', job.abort);
          active.delete(job);
          const index = queued.indexOf(job);
          if (index !== -1) queued.splice(index, 1);
          if (value) resolve(value); else reject(error);
          pump();
        };
        const job: Job = {
          start() {
            decodeFrame(file, controller.signal).then(
              (value) => finish(value), (error: unknown) => finish(undefined, error),
            );
          },
          abort() {
            controller.abort();
            // In-flight decoders release resources before their slot becomes free.
            if (!active.has(job)) finish(undefined, aborted());
          },
        };
        signal?.addEventListener('abort', job.abort, { once: true });
        queued.push(job); pump();
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const job of [...queued, ...active]) job.abort();
    },
  };
}

function decodeFrame(file: Blob, signal: AbortSignal): Promise<VideoThumbnail> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(aborted()); return; }
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const source = URL.createObjectURL(file);
    let settled = false;
    let capturing = false;
    let target: number | undefined;
    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
      video.removeEventListener('error', fail);
      video.removeEventListener('loadedmetadata', metadata);
      video.removeEventListener('loadeddata', capture);
      video.removeEventListener('seeked', capture);
      try { video.pause(); video.removeAttribute('src'); video.load(); }
      catch { /* A broken media element must still release its object URL. */ }
      finally {
        URL.revokeObjectURL(source);
        canvas.width = 0; canvas.height = 0;
      }
    };
    const finish = (value?: VideoThumbnail, error?: unknown) => {
      if (settled) return;
      settled = true; cleanup();
      if (value) resolve(value); else reject(error);
    };
    const cancel = () => finish(undefined, aborted());
    const fail = () => finish(undefined, new Error('This video could not be decoded for a thumbnail.'));
    const capture = () => {
      if (settled || capturing || target === undefined || video.seeking || video.readyState < 2) return;
      if (Math.abs(video.currentTime - target) > 0.05) return;
      if (!video.videoWidth || !video.videoHeight) { fail(); return; }
      capturing = true;
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      const duration = video.duration;
      const time = video.currentTime;
      canvas.width = width; canvas.height = height;
      try {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Thumbnail canvas is unavailable.');
        context.drawImage(video, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) finish({ blob, width, height, duration, time });
          else finish(undefined, new Error('Thumbnail image could not be encoded.'));
        }, 'image/jpeg', 0.82);
      } catch (error) { finish(undefined, error); }
    };
    const metadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) { fail(); return; }
      target = Math.min(1, video.duration / 4);
      try { video.currentTime = target; capture(); }
      catch (error) { finish(undefined, error); }
    };
    const timeout = setTimeout(() => finish(undefined, new Error('Thumbnail extraction timed out.')), 15_000);
    signal.addEventListener('abort', cancel, { once: true });
    video.addEventListener('error', fail);
    video.addEventListener('loadedmetadata', metadata);
    video.addEventListener('loadeddata', capture);
    video.addEventListener('seeked', capture);
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    try { video.src = source; video.load(); }
    catch (error) { finish(undefined, error); }
  });
}
