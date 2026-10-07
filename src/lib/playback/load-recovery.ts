type Availability = { status: number; redirected: boolean };
type Options = {
  check: (source: string, signal: AbortSignal) => Promise<Availability>;
  current: (source: string) => boolean;
  retry: (source: string) => void;
  failed: (source: string, message: string) => void;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
};

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const cancel = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, milliseconds);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

/** Own a bounded recovery budget and invalidate checks when a newer load wins. */
export function createLoadRecovery(options: Options) {
  let controller: AbortController | undefined;
  let attempts = 0;
  let disposed = false;
  const cancel = () => { controller?.abort(); controller = undefined; };
  const reset = () => { cancel(); attempts = 0; };
  return {
    reset,
    loaded: reset,
    dispose() { disposed = true; cancel(); },
    async failed(source: string, code: number) {
      if (disposed || !options.current(source)) return;
      cancel();
      const request = new AbortController(); controller = request;
      const current = () => !disposed && !request.signal.aborted && controller === request && options.current(source);
      let availability: Availability | undefined;
      try { availability = await options.check(source, request.signal); }
      catch { if (!current()) return; }
      if (!current()) return;
      if (availability?.redirected || availability?.status === 401 || availability?.status === 403) {
        options.failed(source, 'Your media access has expired. Sign in again to continue.'); return;
      }
      if (availability && availability.status >= 400 && availability.status < 500) {
        options.failed(source, 'Media is unavailable. Retry playback or check processing.'); return;
      }
      if (attempts < 2) {
        attempts += 1;
        try { await (options.wait ?? wait)(attempts * 350, request.signal); }
        catch { return; }
        if (current()) options.retry(source);
        return;
      }
      options.failed(source, code === 2 || !availability || availability.status >= 500
        ? 'The media connection was interrupted. Retry playback.'
        : code === 3 ? 'This video could not be decoded. Try a browser-supported MP4 or WebM.'
        : 'This video could not be loaded. Retry playback; if it keeps failing, check the media format.');
    },
  };
}
