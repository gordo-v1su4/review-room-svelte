/** Bound each S3 attempt as well as retrying temporary failures. */
export async function retryStorage<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: { wait?: (ms: number) => Promise<void>; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const wait = options.wait ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  for (let attempt = 1; ; attempt++) {
    options.signal?.throwIfAborted();
    const controller = new AbortController();
    const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
    const timeoutError = Object.assign(new Error('Storage operation timed out'), { name: 'TimeoutError' });
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort(timeoutError);
        reject(timeoutError);
      }, options.timeoutMs ?? 30_000);
    });
    let abort: () => void;
    const cancelled = new Promise<never>((_, reject) => {
      abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
    });
    try {
      try { return await Promise.race([operation(signal), timeout, cancelled]); }
      finally { clearTimeout(timer!); signal.removeEventListener('abort', abort!); }
    }
    catch (cause) {
      options.signal?.throwIfAborted();
      const error = cause as { name?: string; $metadata?: { httpStatusCode?: number } };
      const status = error.$metadata?.httpStatusCode;
      const transient = error.name === 'AbortError' || error.name === 'TimeoutError' ||
        (status === 403 && error.name === 'Unknown') || status === 429 || (status !== undefined && status >= 500);
      if (!transient || attempt >= 5) throw cause;
      await wait(500 * 2 ** (attempt - 1));
    }
  }
}
