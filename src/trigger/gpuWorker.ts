// The worker stops first, leaving time to kill its process group and reply before Trigger retries.
export const GPU_JOB_TIMEOUT_MS = 450_000;
export const GPU_RESPONSE_GRACE_MS = 30_000;
export const GPU_WORKER_URL = 'https://app-vm.tail7fdbe2.ts.net:18098/derivatives';

export type GpuDerivativeRequest = {
  originalKey: string;
  thumbnailKey: string;
  spriteKey: string;
  durationSec: number;
  sizeBytes: number;
};

type WorkerFetch = (url: string, init: RequestInit) => Promise<Response>;

export async function requestGpuDerivatives(
  request: GpuDerivativeRequest,
  options: { url: string; secret: string; fetcher?: WorkerFetch },
): Promise<void> {
  if (options.url !== GPU_WORKER_URL || !options.secret) {
    throw new Error('Unexpected Review Room GPU worker target');
  }
  const response = await (options.fetcher ?? fetch)(options.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${options.secret}`, 'content-type': 'application/json', 'x-review-room-deadline': String(Date.now() + GPU_JOB_TIMEOUT_MS) },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(GPU_JOB_TIMEOUT_MS + GPU_RESPONSE_GRACE_MS),
  });
  if (!response.ok) throw new Error(`GPU worker returned ${response.status}`);
  const result = await response.json() as { ok?: boolean };
  if (result.ok !== true) throw new Error('GPU worker did not confirm derivatives');
}
