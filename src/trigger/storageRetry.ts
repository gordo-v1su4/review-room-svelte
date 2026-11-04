/** Bound each S3 attempt as well as retrying temporary failures. */
export async function retryStorage<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: { wait?: (ms: number) => Promise<void>; timeoutMs?: number } = {},
): Promise<T> {
  const wait = options.wait ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController();
    const timeoutError = Object.assign(new Error('Storage operation timed out'), { name: 'TimeoutError' });
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort(timeoutError);
        reject(timeoutError);
      }, options.timeoutMs ?? 30_000);
    });
    try {
      try { return await Promise.race([operation(controller.signal), timeout]); }
      finally { clearTimeout(timer!); }
    }
    catch (cause) {
      const error = cause as { name?: string; $metadata?: { httpStatusCode?: number } };
      const status = error.$metadata?.httpStatusCode;
      const transient = error.name === 'AbortError' || error.name === 'TimeoutError' ||
        (status === 403 && error.name === 'Unknown') || status === 429 || (status !== undefined && status >= 500);
      if (!transient || attempt >= 5) throw cause;
      await wait(500 * 2 ** (attempt - 1));
    }
  }
}
