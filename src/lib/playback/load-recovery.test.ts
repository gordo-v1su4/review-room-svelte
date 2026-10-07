import { expect, test } from 'bun:test';
import { createLoadRecovery } from './load-recovery';

function setup(check = async (_source: string, _signal: AbortSignal) => ({ status: 200, redirected: false })) {
  const retries: string[] = [], failures: string[] = [];
  let source = 'clip-a';
  const recovery = createLoadRecovery({ check, current: value => value === source,
    retry: value => retries.push(value), failed: (_source, message) => failures.push(message),
    wait: async () => {} });
  return { recovery, retries, failures, change: (next: string) => source = next };
}

test('a healthy media endpoint gets bounded automatic recovery before an error', async () => {
  const { recovery, retries, failures } = setup();
  await recovery.failed('clip-a', 4);
  await recovery.failed('clip-a', 4);
  expect(retries).toEqual(['clip-a', 'clip-a']);
  expect(failures).toEqual([]);
  await recovery.failed('clip-a', 4);
  expect(retries).toHaveLength(2);
  expect(failures[0]).toContain('could not be loaded');
});

test('loaded data cancels a delayed check so it cannot replace successful playback with an error', async () => {
  let finish!: (value: { status: number; redirected: boolean }) => void;
  const { recovery, retries, failures } = setup(() => new Promise(resolve => finish = resolve));
  const pending = recovery.failed('clip-a', 4);
  recovery.loaded();
  finish({ status: 200, redirected: false });
  await pending;
  expect(retries).toEqual([]);
  expect(failures).toEqual([]);
});

test('switching clips cancels old recovery and gives the new clip its own retry budget', async () => {
  let finish!: (value: { status: number; redirected: boolean }) => void;
  const { recovery, retries, failures, change } = setup(() => new Promise(resolve => finish = resolve));
  const pending = recovery.failed('clip-a', 2);
  recovery.reset(); change('clip-b');
  finish({ status: 503, redirected: false }); await pending;
  expect(retries).toEqual([]); expect(failures).toEqual([]);
});

test('expired access and missing media are reported without automatic reload loops', async () => {
  for (const status of [401, 403, 404]) {
    const { recovery, retries, failures } = setup(async () => ({ status, redirected: false }));
    await recovery.failed('clip-a', 4);
    expect(retries).toEqual([]);
    expect(failures[0]).toContain(status === 404 ? 'unavailable' : 'expired');
  }
});

test('temporary server and network failures recover without claiming an unsupported format', async () => {
  for (const check of [async () => ({ status: 503, redirected: false }), async () => { throw new Error('network'); }]) {
    const { recovery, retries, failures } = setup(check);
    await recovery.failed('clip-a', 2);
    expect(retries).toEqual(['clip-a']); expect(failures).toEqual([]);
  }
});

test('disposal cancels a pending retry and successful playback renews the retry budget', async () => {
  let finish!: () => void;
  const retries: string[] = [];
  const recovery = createLoadRecovery({ check: async () => ({ status: 200, redirected: false }), current: () => true,
    retry: source => retries.push(source), failed: () => {}, wait: () => new Promise(resolve => finish = resolve) });
  const pending = recovery.failed('clip-a', 4);
  await Promise.resolve(); recovery.dispose(); finish(); await pending;
  expect(retries).toEqual([]);
  const fresh = setup();
  await fresh.recovery.failed('clip-a', 4); await fresh.recovery.failed('clip-a', 4);
  fresh.recovery.loaded(); await fresh.recovery.failed('clip-a', 4);
  expect(fresh.retries).toHaveLength(3);
});
