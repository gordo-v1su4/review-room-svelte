import { request as httpsRequest } from 'node:https';

// The worker stops first, leaving time to kill its process group and reply before Trigger retries.
export const GPU_JOB_TIMEOUT_MS = 450_000;
export const GPU_RESPONSE_GRACE_MS = 30_000;
export const GPU_WORKER_URL = 'https://review.v1su4.dev/internal-gpu/derivatives';

export type GpuDerivativeRequest = {
  originalKey: string;
  thumbnailKey: string;
  spriteKey: string;
  durationSec: number;
  sizeBytes: number;
};

type WorkerFetch = (url: string, init: RequestInit) => Promise<Response>;

// Reach VM100's private proxy directly, retaining the public hostname for SNI
// and normal CA/hostname certificate verification. The proxy denies public clients.
const workerFetch: WorkerFetch = (url, init) => new Promise((resolve, reject) => {
  const req = httpsRequest(url, {
    method: init.method,
    headers: Object.fromEntries(new Headers(init.headers)),
    signal: init.signal ?? undefined,
    family: 4,
    lookup: (_hostname, options, callback) => options.all
      ? callback(null, [{ address: '192.168.8.222', family: 4 }])
      : callback(null, '192.168.8.222', 4),
  }, response => {
    const chunks: Buffer[] = [];
    let size = 0;
    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 4096) response.destroy(new Error('GPU worker response too large'));
      else chunks.push(chunk);
    });
    response.on('error', reject);
    response.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: response.statusCode ?? 502 })));
  });
  req.on('error', reject);
  req.end(init.body as string);
});

export async function requestGpuDerivatives(
  request: GpuDerivativeRequest,
  options: { url: string; secret: string; fetcher?: WorkerFetch },
): Promise<void> {
  if (options.url !== GPU_WORKER_URL || !options.secret) {
    throw new Error('Unexpected Review Room GPU worker target');
  }
  const response = await (options.fetcher ?? workerFetch)(options.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${options.secret}`, 'content-type': 'application/json', 'x-review-room-deadline': String(Date.now() + GPU_JOB_TIMEOUT_MS) },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(GPU_JOB_TIMEOUT_MS + GPU_RESPONSE_GRACE_MS),
  });
  if (!response.ok) throw new Error(`GPU worker returned ${response.status}`);
  const result = await response.json() as { ok?: boolean };
  if (result.ok !== true) throw new Error('GPU worker did not confirm derivatives');
}
