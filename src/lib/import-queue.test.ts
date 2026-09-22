import { describe, expect, test } from 'bun:test';
import { createImportQueue, type ImportJob, type ImportRequest } from './import-queue';
import type { LocalAsset } from './review';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
function request(name: string): ImportRequest {
  return { file: new File(['video'], name, { type: 'video/mp4' }), destinationLabel: 'Studio / Rushes', target: { projectId: 'studio', folderId: 'rushes', dateKey: '20260922', dateFolderId: 'day', assetClass: 'VID' } };
}
function asset(file: File): LocalAsset {
  return { id: 'temporary', name: file.name, sourceFile: file, url: 'blob:test', type: 'video', size: file.size, assetClass: 'VID', importedAt: 1, tags: [], assetCode: '' };
}

describe('local import queue', () => {
  test('prepares a bounded number and commits once to the captured destination', async () => {
    const pending: ReturnType<typeof deferred<LocalAsset>>[] = [];
    const committed: { asset: LocalAsset; folder?: string }[] = [];
    let jobs: readonly ImportJob[] = [];
    const queue = createImportQueue({ concurrency: 2, prepare: () => { const work = deferred<LocalAsset>(); pending.push(work); return work.promise; }, commit: (value, target) => { committed.push({ asset: value, folder: target.folderId }); }, release: () => {}, onChange: value => { jobs = value; } });
    const requests = [request('one.mp4'), request('two.mp4'), request('three.mp4')];
    queue.enqueue(requests);
    const firstId = jobs[0].id;
    requests[0].target.folderId = 'other-folder';
    expect(pending).toHaveLength(2);
    expect(jobs.map(job => job.status)).toEqual(['preparing', 'preparing', 'queued']);
    pending[0].resolve(asset(requests[0].file));
    await settle();
    expect(committed).toHaveLength(1);
    expect(committed[0].folder).toBe('rushes');
    expect(committed[0].asset.id).toBe(firstId);
    expect(pending).toHaveLength(3);
    queue.dispose();
  });
  test('cancel and retry keep old late results from committing or overwriting the new attempt', async () => {
    const pending: { work: ReturnType<typeof deferred<LocalAsset>>; signal: AbortSignal }[] = [];
    const committed: LocalAsset[] = [];
    const released: LocalAsset[] = [];
    let jobs: readonly ImportJob[] = [];
    const queue = createImportQueue({ concurrency: 1, prepare: (_, signal) => { const work = deferred<LocalAsset>(); pending.push({ work, signal }); return work.promise; }, commit: value => { committed.push(value); }, release: value => { released.push(value); }, onChange: value => { jobs = value; } });
    const first = request('first.mp4');
    queue.enqueue([first, request('never-start.mp4')]);
    const id = jobs[0].id;
    queue.cancel(jobs[1].id);
    queue.cancel(id);
    expect(pending[0].signal.aborted).toBe(true);
    queue.retry(id);
    expect(jobs[0].status).toBe('queued');
    expect(pending).toHaveLength(1);
    const stale = asset(first.file);
    pending[0].work.resolve(stale);
    await settle();
    expect(released).toEqual([stale]);
    expect(committed).toHaveLength(0);
    expect(pending).toHaveLength(2);
    expect(jobs.map(job => job.status)).toEqual(['preparing', 'cancelled']);
    pending[1].work.resolve(asset(first.file));
    await settle();
    queue.retry(id);
    expect(committed).toHaveLength(1);
    expect(committed[0].id).toBe(id);
    expect(jobs[0].status).toBe('ready');
    queue.dispose();
  });

  test('failed commits release preparation, remain visible after clearing, and can retry', async () => {
    let fail = true;
    const prepared: LocalAsset[] = [];
    const released: LocalAsset[] = [];
    const committed: LocalAsset[] = [];
    let jobs: readonly ImportJob[] = [];
    const queue = createImportQueue({ prepare: async file => { const value = asset(file); prepared.push(value); return value; }, commit: value => { if (fail) throw new Error('Destination unavailable'); committed.push(value); }, release: value => { released.push(value); }, onChange: value => { jobs = value; } });
    queue.enqueue([request('retry.mp4')]);
    const id = jobs[0].id;
    await settle();
    expect(jobs[0].status).toBe('failed');
    expect(jobs[0].error).toBe('Destination unavailable');
    expect(released).toEqual(prepared);
    queue.clearFinished();
    expect(jobs).toHaveLength(1);
    fail = false;
    queue.retry(id);
    await settle();
    expect(jobs[0].status).toBe('ready');
    expect(jobs[0].error).toBeUndefined();
    expect(committed.map(value => value.id)).toEqual([id]);
    queue.clearFinished();
    expect(jobs).toHaveLength(0);
    queue.dispose();
  });

  test('disposal aborts active work, releases late success and emits no later changes', async () => {
    const work = deferred<LocalAsset>();
    let signal!: AbortSignal;
    let changes = 0;
    let started = 0;
    const released: LocalAsset[] = [];
    const committed: LocalAsset[] = [];
    const queue = createImportQueue({ concurrency: 1, prepare: (_, value) => { started++; signal = value; return work.promise; }, commit: value => { committed.push(value); }, release: value => { released.push(value); }, onChange: () => { changes++; } });
    const first = request('first.mp4');
    queue.enqueue([first, request('queued.mp4')]);
    queue.dispose();
    expect(signal.aborted).toBe(true);
    const before = changes;
    queue.enqueue([request('ignored.mp4')]);
    queue.clearFinished();
    const late = asset(first.file);
    work.resolve(late);
    await settle();
    expect(released).toEqual([late]);
    expect(committed).toHaveLength(0);
    expect(changes).toBe(before);
    expect(started).toBe(1);
  });

  test('preparation failure frees its slot and a cancelled rejection cannot replace retry state', async () => {
    const pending: ReturnType<typeof deferred<LocalAsset>>[] = [];
    let jobs: readonly ImportJob[] = [];
    const committed: LocalAsset[] = [];
    const queue = createImportQueue({ concurrency: 1, prepare: () => { const work = deferred<LocalAsset>(); pending.push(work); return work.promise; }, commit: value => { committed.push(value); }, release: () => {}, onChange: value => { jobs = value; } });
    const requests = [request('broken.mp4'), request('second.mp4')];
    queue.enqueue(requests);
    const firstId = jobs[0].id;
    const secondId = jobs[1].id;
    pending[0].reject(new Error('Cannot read this file'));
    await settle();
    expect(jobs[0].error).toBe('Cannot read this file');
    expect(jobs[1].status).toBe('preparing');
    queue.cancel(secondId);
    queue.retry(secondId);
    pending[1].reject(new DOMException('Aborted', 'AbortError'));
    await settle();
    expect(jobs[1].status).toBe('preparing');
    expect(jobs[1].error).toBeUndefined();
    pending[2].resolve(asset(requests[1].file));
    await settle();
    queue.retry(firstId);
    pending[3].resolve(asset(requests[0].file));
    await settle();
    expect(committed.map(value => value.id)).toEqual([secondId, firstId]);
    queue.dispose();
  });

});
