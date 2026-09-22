/** One active decode, one latest pending intent; ownership transfers only on delivery. */
export function createLatestPreviewQueue<T extends { close(): void }>(port: {
  decode(time: number, signal: AbortSignal): Promise<T>;
  deliver(id: number, frame: T): void;
  fail(reason: unknown): void;
}) {
  let pending: { id: number; time: number } | undefined;
  let active: AbortController | undefined;
  let disposed = false;
  async function pump() {
    if (disposed || active || !pending) return;
    const job = pending; pending = undefined;
    const controller = new AbortController(); active = controller;
    try {
      const frame = await port.decode(job.time, controller.signal);
      if (disposed || controller.signal.aborted) frame.close();
      else {
        try { port.deliver(job.id, frame); } catch (error) { frame.close(); throw error; }
      }
    } catch (error) { if (!disposed && !controller.signal.aborted) port.fail(error); }
    finally { active = undefined; void pump(); }
  }
  return {
    request(id: number, time: number) {
      if (disposed || !Number.isFinite(time)) return;
      pending = { id, time: Math.max(0, time) }; void pump();
    },
    cancel() { pending = undefined; active?.abort(); },
    dispose() { disposed = true; pending = undefined; active?.abort(); },
  };
}
