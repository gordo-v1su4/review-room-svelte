/** RustFS can return an opaque 403 during a burst; retry only that form and temporary HTTP failures. */
export async function retryStorage<T>(operation: () => Promise<T>, options: { wait?: (ms: number) => Promise<void> } = {}): Promise<T> {
  const wait = options.wait ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  for (let attempt = 1; ; attempt++) {
    try { return await operation(); }
    catch (cause) {
      const error = cause as { name?: string; $metadata?: { httpStatusCode?: number } };
      const status = error.$metadata?.httpStatusCode;
      const transient = (status === 403 && error.name === 'Unknown') || status === 429 || (status !== undefined && status >= 500);
      if (!transient || attempt >= 5) throw cause;
      await wait(500 * 2 ** (attempt - 1));
    }
  }
}
