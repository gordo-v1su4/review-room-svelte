import { expect, test } from 'bun:test';
import { liveCursor, observeChanges, planLiveRefresh, receivePick, type LiveAsset, type LiveChanges, type LiveRefreshEnv, type LiveVersion } from './live-refresh';
import type { ProcessingUpdate } from './processing';

const pick = (versionNumber: number, updatedAt: number, assetId = 'shot'): ProcessingUpdate => ({
  assetId, versionId: `${assetId}-v${versionNumber}`, versionNumber, updatedAt, ready: true, hasPoster: true,
});
const take = (assetId: string, version: number, extra: Partial<LiveVersion> = {}): LiveVersion => ({
  id: `${assetId}-v${version}`, assetId, version, processingState: 'ready', hasPoster: true, sizeBytes: 100, mimeType: 'video/mp4',
  excluded: false, metadata: null, metadataUpdatedAt: null, ...extra,
});
const row = (id: string, current: ProcessingUpdate, extra: Partial<LiveAsset> = {}): LiveAsset => ({
  id, projectId: 'p1', folderId: 'scene', name: id.toUpperCase(), assetCode: id.toUpperCase(), originalFilename: `${id}.mp4`, mimeType: 'video/mp4',
  sizeBytes: 100, importedAt: 1, misfiled: false, status: 'awaiting_review', rating: 0, shortlisted: false, viewed: false, processing: current, ...extra,
});
const changes = (extra: Partial<LiveChanges> = {}): LiveChanges => ({ cursor: '50', assets: [], versions: [], removedAssetIds: [], ...extra });

// --- Which take is shown when the pick changes ---

test('an asset that follows its current version moves to the new pick', () => {
  expect(receivePick({ current: pick(2, 10), displayedVersionId: 'shot-v2', pinned: false, unsaved: false }, pick(3, 20)))
    .toEqual({ follow: true, clearOverride: true });
});

test('a take chosen on purpose that is not the pick stays on screen while the pick still moves', () => {
  const result = receivePick({ current: pick(2, 10), displayedVersionId: 'shot-v1', pinned: true, unsaved: false }, pick(3, 20));
  // Accepted (the caller marks v3 current) but the picture is left alone.
  expect(result).toEqual({ follow: false, clearOverride: true });
});

test('a chosen take that was the pick follows the pick', () => {
  expect(receivePick({ current: pick(2, 10), displayedVersionId: 'shot-v2', pinned: true, unsaved: false }, pick(1, 20))?.follow).toBe(true);
});

test('a take with unsaved details is never swapped away', () => {
  expect(receivePick({ current: pick(2, 10), displayedVersionId: 'shot-v2', pinned: true, unsaved: true }, pick(3, 20))).toEqual({ follow: false, clearOverride: true });
  expect(receivePick({ current: pick(2, 10), displayedVersionId: 'shot-v2', pinned: false, unsaved: true }, pick(3, 20))?.follow).toBe(false);
});

test('a read that repeats the known pick never moves a chosen take', () => {
  // Make current was just clicked on v1; a read from before that write still says v2.
  expect(receivePick({ current: pick(2, 10), displayedVersionId: 'shot-v1', pinned: true, unsaved: false }, pick(2, 10))).toEqual({ follow: false, clearOverride: false });
  // A read made after every local write settles the mark even when it repeats the known pick.
  expect(receivePick({ current: pick(2, 10), displayedVersionId: 'shot-v1', pinned: true, unsaved: false }, pick(2, 10), true)).toEqual({ follow: false, clearOverride: true });
});

test('nothing moves when the pick is already on screen', () => {
  expect(receivePick({ current: pick(2, 10), displayedVersionId: 'shot-v3', pinned: true, unsaved: false }, pick(3, 20))?.follow).toBe(false);
});

test('a stale read is ignored', () => {
  expect(receivePick({ current: pick(3, 20), displayedVersionId: 'shot-v3', pinned: false, unsaved: false }, pick(2, 10))).toBeNull();
});

// --- What a refresh changes in the workspace ---

const held = (extra: Partial<Parameters<typeof planLiveRefresh>[0]> = {}) => ({
  projectId: 'p1',
  assets: [{ id: 'a', projectId: 'p1', displayedVersionId: 'a-v2' }, { id: 'b', projectId: 'p1', displayedVersionId: 'b-v1' }, { id: 'z', projectId: 'p2', displayedVersionId: 'z-v1' }],
  versions: [take('a', 1), take('a', 2), take('b', 1), take('z', 1)],
  unsaved: new Set<string>(),
  ...extra,
});

test('an exclusion and a new take are merged into the known takes', () => {
  const plan = planLiveRefresh(held(), changes({ assets: [row('a', pick(2, 20, 'a'))], versions: [take('a', 1, { excluded: true }), take('a', 3)] }));
  expect(plan.versions.filter(version => version.assetId === 'a').map(version => [version.version, version.excluded])).toEqual([[1, true], [2, false], [3, false]]);
  expect(plan.versions.filter(version => version.assetId !== 'a')).toEqual([take('b', 1), take('z', 1)]);
  expect(plan.updated.map(asset => asset.id)).toEqual(['a']);
  expect(plan.added).toEqual([]);
  expect(plan.removed).toEqual([]);
});

test('an asset the workspace does not hold is added with its takes', () => {
  const plan = planLiveRefresh(held(), changes({ assets: [row('c', pick(1, 20, 'c')), row('b', pick(1, 20, 'b'), { status: 'approved' })], versions: [take('c', 1)] }));
  expect(plan.added.map(asset => asset.id)).toEqual(['c']);
  expect(plan.updated.map(asset => [asset.id, asset.status])).toEqual([['b', 'approved']]);
  expect(plan.versions.map(version => version.id)).toContain('c-v1');
});

test('a repeated row is applied once, newest last', () => {
  const plan = planLiveRefresh(held(), changes({ assets: [row('a', pick(2, 20, 'a'), { status: 'needs_changes' }), row('a', pick(1, 30, 'a'), { status: 'approved' })] }));
  expect(plan.updated).toHaveLength(1);
  expect(plan.updated[0]).toMatchObject({ status: 'approved', processing: { versionId: 'a-v1' } });
});

test('a removed asset is forgotten with its takes', () => {
  const plan = planLiveRefresh(held(), changes({ removedAssetIds: ['a', 'never-held'] }));
  expect(plan.removed).toEqual(['a']);
  expect(plan.versions.map(version => version.id)).toEqual(['b-v1', 'z-v1']);
});

test('an id list removes only the read project\'s missing assets', () => {
  const plan = planLiveRefresh(held(), changes({ assetIds: ['a', 'c'], assets: [row('c', pick(1, 20, 'c'))], versions: [take('c', 1)] }));
  expect(plan.removed).toEqual(['b']);
  expect(plan.added.map(asset => asset.id)).toEqual(['c']);
  // z belongs to another project and is not in this project's list.
  expect(plan.versions.map(version => version.id)).toEqual(['a-v1', 'a-v2', 'z-v1', 'c-v1']);
});

test('a row for an asset reported removed is dropped', () => {
  const plan = planLiveRefresh(held(), changes({ removedAssetIds: ['a'], assets: [row('a', pick(2, 20, 'a'))], versions: [take('a', 3)] }));
  expect(plan.updated).toEqual([]);
  expect(plan.versions.some(version => version.assetId === 'a')).toBe(false);
});

test('details changed elsewhere replace what is shown unless there is an unsaved draft', () => {
  const edited = take('a', 2, { metadata: { prompt: 'Rain' }, metadataUpdatedAt: 40 });
  expect(planLiveRefresh(held(), changes({ assets: [row('a', pick(2, 20, 'a'))], versions: [edited] })).details).toEqual([edited]);
  expect(planLiveRefresh(held({ unsaved: new Set(['a-v2']) }), changes({ assets: [row('a', pick(2, 20, 'a'))], versions: [edited] })).details).toEqual([]);
  // A take that is not on screen, and a take whose details did not change, are left alone.
  expect(planLiveRefresh(held(), changes({ versions: [take('a', 1, { metadataUpdatedAt: 40 }), take('b', 1, { excluded: true })] })).details).toEqual([]);
});

test('the first read starts from the newest change the snapshot holds', () => {
  expect(liveCursor([{ updatedAt: 10 }, { updatedAt: 5, versionsUpdatedAt: 40 }, { updatedAt: 20 }])).toBe(40);
  expect(liveCursor([])).toBe(0);
});

// --- When a refresh is asked for ---

function fakeEnv() {
  let visible = true, now = 0, nextId = 0;
  const timers = new Map<number, { run: () => void; at: number }>();
  const wakes = new Set<() => void>();
  const env: LiveRefreshEnv = {
    visible: () => visible, now: () => now,
    onWake(run) { wakes.add(run); return () => wakes.delete(run); },
    setTimer(run, ms) { const id = ++nextId; timers.set(id, { run, at: now + ms }); return id; },
    clearTimer(id) { timers.delete(id as number); },
  };
  return {
    env, timers, wakes,
    show(value: boolean) { visible = value; },
    /** Move the clock, running due timers in order; lets async reads settle between timers. */
    async advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at; timers.delete(due[0]); due[1].run();
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      now = end;
      await new Promise(resolve => setTimeout(resolve, 0));
    },
    async wake() { for (const run of [...wakes]) run(); await new Promise(resolve => setTimeout(resolve, 0)); },
  };
}

test('reads on the interval while visible and never while hidden', async () => {
  const fake = fakeEnv();
  let reads = 0;
  const observer = observeChanges(async () => { reads += 1; }, fake.env);
  expect(reads).toBe(0);
  await fake.advance(10_000);
  expect(reads).toBe(1);
  fake.show(false);
  await fake.advance(60_000);
  expect(reads).toBe(1);
  fake.show(true);
  await fake.advance(10_000);
  expect(reads).toBe(2);
  observer.stop();
  await fake.advance(60_000);
  expect(reads).toBe(2);
  expect(fake.wakes.size).toBe(0);
});

test('reads at once when the window is shown or focused, once for both events', async () => {
  const fake = fakeEnv();
  let reads = 0;
  const observer = observeChanges(async () => { reads += 1; }, fake.env);
  await fake.advance(3_000);
  await fake.wake();
  await fake.wake();
  expect(reads).toBe(1);
  // The interval restarts from the wake.
  await fake.advance(9_000);
  expect(reads).toBe(1);
  await fake.advance(1_000);
  expect(reads).toBe(2);
  fake.show(false);
  await fake.advance(5_000);
  await fake.wake();
  expect(reads).toBe(2);
  observer.stop();
});

test('one read at a time', async () => {
  const fake = fakeEnv();
  let reads = 0, finish = () => {};
  const observer = observeChanges(() => { reads += 1; return new Promise<void>(resolve => { finish = resolve; }); }, fake.env);
  await fake.advance(10_000);
  await fake.wake();
  await fake.advance(30_000);
  expect(reads).toBe(1);
  finish();
  await fake.advance(0);
  await fake.advance(10_000);
  expect(reads).toBe(2);
  observer.stop();
});

test('a failed read is silent and tried again on the next interval; a deferred read is tried again soon', async () => {
  const fake = fakeEnv();
  const results: (() => Promise<boolean | void>)[] = [() => Promise.reject(new Error('offline')), () => Promise.resolve(false), () => Promise.resolve()];
  let reads = 0;
  const observer = observeChanges(() => results[reads++](), fake.env);
  await fake.advance(10_000);
  expect(reads).toBe(1);
  await fake.advance(9_000);
  expect(reads).toBe(1);
  await fake.advance(1_000);
  expect(reads).toBe(2);
  await fake.advance(1_000);
  expect(reads).toBe(3);
  observer.stop();
});
