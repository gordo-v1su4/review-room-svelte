import { expect, test } from 'bun:test';
import { createLatestPreviewQueue } from './latest';

test('continuous dragging delivers active frames and coalesces pending work to newest intent', async () => {
  const pending: { signal: AbortSignal; resolve: (frame: { close(): void }) => void }[] = [];
  const delivered: number[] = []; let closed = 0;
  const queue = createLatestPreviewQueue({
    decode: (_time, signal) => new Promise<{ close(): void }>(resolve => pending.push({ signal, resolve })),
    deliver: (id, frame) => { delivered.push(id); frame.close(); }, fail: () => {},
  });
  queue.request(1, 1); queue.request(2, 2); queue.request(3, 3);
  expect(pending).toHaveLength(1); expect(pending[0]!.signal.aborted).toBe(false);
  pending[0]!.resolve({ close() { closed++; } });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(pending).toHaveLength(2);
  pending[1]!.resolve({ close() { closed++; } });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(delivered).toEqual([1, 3]); expect(closed).toBe(2);
  queue.dispose(); queue.request(4, 4); expect(pending).toHaveLength(2);
});

test('cancelled decode errors do not trigger fallback, but current decode errors do', async () => {
  const pending: ((reason: unknown) => void)[] = [];
  const failures: unknown[] = [];
  const queue = createLatestPreviewQueue({
    decode: () => new Promise<{ close(): void }>((_resolve, reject) => pending.push(reject)),
    deliver: (_id, frame) => frame.close(), fail: error => failures.push(error),
  });
  queue.request(1, 1); queue.cancel(); pending[0]!(new Error('Cancelled decode'));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(failures).toEqual([]);
  queue.request(2, 2); const unsupported = new Error('Unsupported codec'); pending[1]!(unsupported);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(failures).toEqual([unsupported]); queue.dispose();
});


test('release cancels pending intent and closes a late frame without delivery', async () => {
  let resolve!: (frame: { close(): void }) => void;
  let signal!: AbortSignal;
  let closed = 0, delivered = 0, decodes = 0;
  const queue = createLatestPreviewQueue({
    decode: (_time, activeSignal) => { decodes++; signal = activeSignal; return new Promise<{ close(): void }>(done => resolve = done); },
    deliver: () => { delivered++; }, fail: () => {},
  });
  queue.request(1, 1); queue.request(2, 2); queue.cancel();
  expect(signal.aborted).toBe(true);
  resolve({ close() { closed++; } });
  await new Promise(done => setTimeout(done, 0));
  expect(closed).toBe(1); expect(delivered).toBe(0); expect(decodes).toBe(1);
  queue.dispose();
});
