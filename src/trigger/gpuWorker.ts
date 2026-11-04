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
  if (options.url !== 'http://192.168.8.222:18098/derivatives' || !options.secret) {
    throw new Error('Unexpected Review Room GPU worker target');
  }
  const response = await (options.fetcher ?? fetch)(options.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${options.secret}`, 'content-type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(480_000),
  });
  if (!response.ok) throw new Error(`GPU worker returned ${response.status}`);
  const result = await response.json() as { ok?: boolean };
  if (result.ok !== true) throw new Error('GPU worker did not confirm derivatives');
}
