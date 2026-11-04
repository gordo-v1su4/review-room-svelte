import { S3Client } from '@aws-sdk/client-s3';
import { execFileSync } from 'node:child_process';
import { generateGpuDerivatives, validateGpuRequest } from './gpu-derivatives';
import { GPU_JOB_TIMEOUT_MS } from '../../src/trigger/gpuWorker';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

if (required('S3_ENDPOINT') !== 'https://s3.v1su4.dev' || required('S3_BUCKET') !== 'review-room-svelte') {
  throw new Error('Unexpected Review Room storage target');
}
const secret = required('REVIEW_ROOM_GPU_WORKER_SECRET');
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: required('S3_ACCESS_KEY_ID'), secretAccessKey: required('S3_SECRET_ACCESS_KEY') },
});

function gpuReady() {
  try { return execFileSync('nvidia-smi', ['-L'], { encoding: 'utf8', timeout: 5_000 }).includes('RTX 4070 Ti'); }
  catch { return false; }
}

Bun.serve({
  port: 8787,
  maxRequestBodySize: 4096,
  async fetch(request, server) {
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/health') {
      const ok = gpuReady();
      return Response.json({ ok, gpuAvailable: ok }, { status: ok ? 200 : 503 });
    }
    if (request.method === 'POST' && path === '/derivatives') {
      if (request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
      if (!gpuReady()) return new Response('GPU unavailable', { status: 503 });
      try {
        const value = validateGpuRequest(await request.json());
        const remaining = Number(request.headers.get('x-review-room-deadline')) - Date.now();
        if (!Number.isFinite(remaining) || remaining <= 0) return new Response('Expired job deadline', { status: 408 });
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.min(GPU_JOB_TIMEOUT_MS, Math.ceil(remaining)))]);
        // Authenticated long jobs use the total deadline, not Bun's 10s socket idle timeout.
        server.timeout(request, 0);
        return Response.json(await generateGpuDerivatives(client, 'review-room-svelte', value, { signal }));
      }
      catch (cause) {
        console.error('Review Room GPU derivative failed', cause);
        return new Response('GPU derivative failed', { status: 503 });
      }
    }
    return new Response('Not found', { status: 404 });
  },
});
