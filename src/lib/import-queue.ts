import type { LocalAsset } from './review';

export type ImportTarget = { projectId: string; folderId?: string; dateKey: string; assetClass: 'VID' | 'IMG' | 'CTX' | 'STB' };
export type ImportRequest = { file: File; target: ImportTarget; destinationLabel: string };
export type ImportJob = ImportRequest & { id: string; status: 'queued' | 'preparing' | 'ready' | 'failed' | 'cancelled'; error?: string; stage?: string; progress?: number; canCancel?: boolean };
type ImportPort = {
  prepare: (file: File, signal: AbortSignal) => Promise<LocalAsset>;
  commit: (asset: LocalAsset, target: ImportTarget, signal: AbortSignal, jobId: string) => void | Promise<void>;
  release: (asset: LocalAsset) => void;
  onChange: (jobs: readonly ImportJob[]) => void;
  concurrency?: number;
};

/** Owns preparation until commit succeeds. The caller then owns the asset resources. */
export function createImportQueue(port: ImportPort) {
  const concurrency = port.concurrency ?? 2;
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Import concurrency must be a positive integer.');
  let jobs: ImportJob[] = [];
  let disposed = false;
  // Cancelled work keeps its slot until it settles, including adapters that ignore abort.
  // A retry can be queued immediately but cannot overlap that job's old preparation.
  const attempts = new Map<string, AbortController>();
  function publish() {
    if (!disposed) port.onChange(jobs.map(job => ({ ...job })));
  }
  function pump() {
    if (disposed) return;
    while (attempts.size < concurrency) {
      const job = jobs.find(item => item.status === 'queued' && !attempts.has(item.id));
      if (!job) break;
      const controller = new AbortController();
      attempts.set(job.id, controller);
      job.status = 'preparing';
      publish();
      void run(job, controller);
    }
  }
  async function run(job: ImportJob, controller: AbortController) {
    let prepared: LocalAsset | undefined;
    try {
      prepared = await port.prepare(job.file, controller.signal);
      if (disposed || controller.signal.aborted) return;
      await port.commit({ ...prepared, id: job.id }, job.target, controller.signal, job.id);
      prepared = undefined;
      job.status = 'ready';
    } catch (error) {
      if (disposed || controller.signal.aborted) return;
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'This file could not be imported. Try again.';
    } finally {
      if (prepared) port.release(prepared);
      attempts.delete(job.id);
      publish();
      pump();
    }
  }
  return {
    enqueue(requests: readonly ImportRequest[]) {
      if (disposed) return;
      jobs.push(...requests.map(request => ({ ...request, target: Object.freeze({ ...request.target }), id: crypto.randomUUID(), status: 'queued' as const })));
      publish();
      pump();
    },
    cancel(id: string) {
      if (disposed) return;
      const job = jobs.find(item => item.id === id);
      if (!job || job.canCancel === false || (job.status !== 'queued' && job.status !== 'preparing')) return;
      job.status = 'cancelled';
      delete job.error;
      attempts.get(id)?.abort();
      publish();
      pump();
    },
    retry(id: string) {
      if (disposed) return;
      const job = jobs.find(item => item.id === id);
      if (!job || (job.status !== 'failed' && job.status !== 'cancelled')) return;
      job.status = 'queued';
      delete job.error;
      delete job.stage; delete job.progress; delete job.canCancel;
      publish();
      pump();
    },
    clearFinished() {
      if (disposed) return;
      jobs = jobs.filter(job => job.status !== 'ready' && job.status !== 'cancelled');
      publish();
    },
    update(id: string, value: Pick<ImportJob, 'stage' | 'progress' | 'canCancel'>) {
      const job = jobs.find(job => job.id === id);
      if (!disposed && job?.status === 'preparing') { Object.assign(job, value); publish(); }
    },
    dispose() {
      disposed = true;
      for (const controller of attempts.values()) controller.abort();
      jobs = [];
    }
  };
}
