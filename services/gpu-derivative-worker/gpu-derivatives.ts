import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { retryStorage } from '../../src/trigger/storageRetry';

export type GpuRequest = {
  originalKey: string;
  thumbnailKey: string;
  spriteKey: string;
  durationSec: number;
  sizeBytes: number;
};

export function validateGpuRequest(value: unknown): GpuRequest {
  if (!value || typeof value !== 'object') throw new Error('Invalid GPU request');
  const input = value as Partial<GpuRequest>;
  const match = typeof input.originalKey === 'string' && input.originalKey.match(
    /^(assets\/[a-z0-9]+\/videos\/[a-f0-9]{64})\/original\.[a-z0-9]+$/i,
  );
  if (!match) throw new Error('Invalid original key');
  const version = typeof input.thumbnailKey === 'string' && input.thumbnailKey.match(
    new RegExp(`^${match[1]}/versions/([a-z0-9]{1,64})/thumbnail\\.jpg$`, 'i'),
  );
  if (!version || input.spriteKey !== `${match[1]}/versions/${version[1]}/sprite.jpg`) {
    throw new Error('Invalid derivative keys');
  }
  if (!Number.isFinite(input.durationSec) || !Number.isFinite(input.sizeBytes) ||
      input.durationSec! <= 0 || input.durationSec! > 86_400 ||
      !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes! < 1) {
    throw new Error('Invalid video metadata');
  }
  return input as GpuRequest;
}

async function generateOnGpu(input: string, thumbnail: string, sprite: string, durationSec: number) {
  const script = fileURLToPath(new URL('./gpu-derivatives.sh', import.meta.url));
  const seek = String(Math.min(1, durationSec / 2));
  const fps = String(Math.max(0.1, 10 / durationSec));
  const lock = process.env.GPU_LOCK_PATH ?? '/gpu-lock/stack-structure-gpu.lock';
  await new Promise<void>((resolve, reject) => {
    const child = spawn('timeout', ['-k', '5s', '355s', 'flock', '-w', '180', lock, 'bash', script,
      process.env.FFMPEG_PATH ?? 'ffmpeg', input, thumbnail, sprite, seek, fps], {
      stdio: ['ignore', 'ignore', 'pipe'], signal: AbortSignal.timeout(360_000),
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr = (stderr + String(chunk)).slice(-4000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`GPU ffmpeg exit ${code}: ${stderr.slice(-500)}`)));
  });
}

export async function generateGpuDerivatives(client: S3Client, bucket: string, value: unknown) {
  const request = validateGpuRequest(value);
  const dir = await mkdtemp(join(tmpdir(), 'review-room-gpu-'));
  const input = join(dir, 'original');
  try {
    const timeoutMs = Math.min(180_000, 60_000 + Math.ceil(request.sizeBytes / 1_048_576) * 2_000);
    await retryStorage(async signal => {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: request.originalKey }), { abortSignal: signal });
      if (!object.Body) throw new Error('Original object has no body');
      await pipeline(object.Body as unknown as Readable, createWriteStream(input), { signal });
    }, { timeoutMs });
    const thumbnail = join(dir, 'thumbnail.jpg');
    const sprite = join(dir, 'sprite.jpg');
    await generateOnGpu(input, thumbnail, sprite, request.durationSec);
    for (const [key, path] of [[request.thumbnailKey, thumbnail], [request.spriteKey, sprite]]) {
      const bytes = await readFile(path);
      if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
        throw new Error('GPU derivative is not a JPEG');
      }
      await retryStorage(signal => client.send(new PutObjectCommand({
        Bucket: bucket, Key: key, Body: bytes, ContentType: 'image/jpeg',
      }), { abortSignal: signal }));
    }
    return { ok: true };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
