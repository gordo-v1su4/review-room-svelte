import { task } from '@trigger.dev/sdk';
import { ConvexHttpClient } from 'convex/browser';
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server';
import { internal } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type JobId = Id<'mediaJobs'>;
type Probe = { durationSec: number; width: number; height: number };

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function convex() {
  const url = process.env.REVIEW_ROOM_CONVEX_URL ?? 'https://review-convex.v1su4.dev';
  if (url !== 'https://review-convex.v1su4.dev') throw new Error('Unexpected Convex target');
  const client = new ConvexHttpClient(url);
  (client as ConvexHttpClient & { setAdminAuth(token: string): void }).setAdminAuth(required('REVIEW_ROOM_CONVEX_ADMIN_KEY'));
  return {
    query<T extends FunctionReference<'query', 'public' | 'internal'>>(ref: T, args: FunctionArgs<T>): Promise<FunctionReturnType<T>> {
      return client.query(ref as never, args as never) as Promise<FunctionReturnType<T>>;
    },
    mutation<T extends FunctionReference<'mutation', 'public' | 'internal'>>(ref: T, args: FunctionArgs<T>): Promise<FunctionReturnType<T>> {
      return client.mutation(ref as never, args as never) as Promise<FunctionReturnType<T>>;
    },
  };
}

function storage() {
  if (process.env.S3_ENDPOINT !== 'https://s3.v1su4.dev' || process.env.S3_BUCKET !== 'review-room-svelte') {
    throw new Error('Unexpected Review Room storage target');
  }
  return new S3Client({
    endpoint: required('S3_ENDPOINT'), region: process.env.S3_REGION ?? 'us-east-1', forcePathStyle: true,
    credentials: { accessKeyId: required('S3_ACCESS_KEY_ID'), secretAccessKey: required('S3_SECRET_ACCESS_KEY') },
  });
}

const bucket = 'review-room-svelte';

async function runCommand(command: string, args: string[]) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], signal: AbortSignal.timeout(120_000) });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => { out += String(chunk); });
    child.stderr.on('data', (chunk) => { err += String(chunk).slice(-4000); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(out) : reject(new Error(`${command} exit ${code}: ${err.slice(-500)}`)));
  });
}

async function download(client: S3Client, key: string, path: string) {
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) throw new Error('Original object has no body');
  await writeFile(path, Buffer.from(await object.Body.transformToByteArray()));
}

async function withOriginal<T>(key: string, run: (path: string, client: S3Client) => Promise<T>) {
  const dir = await mkdtemp(join(tmpdir(), 'review-room-ingest-'));
  try {
    const client = storage();
    const path = join(dir, 'original');
    await download(client, key, path);
    return await run(path, client);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const verifyMedia = task({
  id: 'review-room-verify-media',
  queue: { concurrencyLimit: 2 },
  retry: { maxAttempts: 2 },
  run: async ({ jobId }: { jobId: JobId }): Promise<Probe> => {
    const { version } = await convex().query(internal.mediaJobs.get, { jobId });
    const client = storage();
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: version.originalKey }));
    if (head.ContentLength !== version.sizeBytes || head.ContentType !== version.mimeType ||
        (version.etag && head.ETag !== version.etag)) throw new Error('Original object verification failed');
    return await withOriginal(version.originalKey, async (path) => {
      const raw = await runCommand(process.env.FFPROBE_PATH ?? 'ffprobe', [
        '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', path,
      ]);
      const parsed = JSON.parse(raw) as { streams?: { width?: number; height?: number }[]; format?: { duration?: string } };
      const probe = { durationSec: Number(parsed.format?.duration), width: Number(parsed.streams?.[0]?.width),
        height: Number(parsed.streams?.[0]?.height) };
      if (!Number.isFinite(probe.durationSec) || probe.durationSec <= 0 || probe.durationSec > 86400 ||
          !Number.isSafeInteger(probe.width) || probe.width < 1 ||
          !Number.isSafeInteger(probe.height) || probe.height < 1) throw new Error('Video inspection failed');
      return probe;
    });
  },
});

const makeDerivatives = task({
  id: 'review-room-generate-derivatives',
  queue: { concurrencyLimit: 1 },
  retry: { maxAttempts: 2 },
  run: async ({ jobId, probe }: { jobId: JobId; probe: Probe }) => {
    const { version } = await convex().query(internal.mediaJobs.get, { jobId });
    const base = version.originalKey.slice(0, version.originalKey.lastIndexOf('/'));
    const thumbnailKey = `${base}/versions/${version._id}/thumbnail.jpg`;
    const spriteKey = `${base}/versions/${version._id}/sprite.jpg`;
    const client = storage();
    const existing = await Promise.all([thumbnailKey, spriteKey].map(async (key) => {
      try { return (await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).ContentLength ?? 0; }
      catch (cause) { if ((cause as { name?: string }).name === 'NotFound') return 0; throw cause; }
    }));
    if (existing.every((size) => size > 0)) return { thumbnailKey, spriteKey };
    return await withOriginal(version.originalKey, async (input, s3) => {
      const dir = input.slice(0, input.lastIndexOf('/'));
      const thumbnail = join(dir, 'thumbnail.jpg');
      const sprite = join(dir, 'sprite.jpg');
      const ffmpeg = process.env.FFMPEG_PATH ?? 'ffmpeg';
      await runCommand(ffmpeg, ['-nostdin', '-y', '-threads', '2', '-ss', String(Math.min(1, probe.durationSec / 2)),
        '-i', input, '-frames:v', '1', '-q:v', '3', thumbnail]);
      await runCommand(ffmpeg, ['-nostdin', '-y', '-threads', '2', '-i', input,
        '-vf', `fps=${Math.max(0.1, 10 / probe.durationSec)},scale=320:-1,tile=10x1`, '-frames:v', '1', sprite]);
      for (const [key, path] of [[thumbnailKey, thumbnail], [spriteKey, sprite]]) {
        const body = await readFile(path);
        if (body.byteLength < 1) throw new Error('Empty derivative');
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/jpeg' }));
      }
      return { thumbnailKey, spriteKey };
    });
  },
});

const finalizeMedia = task({
  id: 'review-room-finalize-media',
  queue: { concurrencyLimit: 2 },
  retry: { maxAttempts: 2 },
  run: async ({ jobId, attempt, runId, probe, thumbnailKey, spriteKey }: {
    jobId: JobId; attempt: number; runId: string; probe: Probe; thumbnailKey: string; spriteKey: string;
  }) => {
    const client = storage();
    for (const key of [thumbnailKey, spriteKey]) {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (!head.ContentLength) throw new Error('Derivative not durable');
    }
    const applied = await convex().mutation(internal.mediaJobs.complete, {
      jobId, attempt, runId, ...probe, thumbnailKey, spriteKey,
    });
    if (!applied) throw new Error('Media job was superseded');
    return { jobId, thumbnailKey, spriteKey };
  },
});

export const reviewRoomIngest = task({
  id: 'review-room-ingest',
  queue: { concurrencyLimit: 2 },
  retry: { maxAttempts: 1 },
  run: async ({ jobId, attempt, simulateFailure }: { jobId: JobId; attempt: number; simulateFailure?: boolean }, { ctx }) => {
    const client = convex();
    const { job } = await client.query(internal.mediaJobs.get, { jobId });
    if (job.status === 'ready') return { jobId, alreadyReady: true };
    if (job.attempt !== attempt) throw new Error('Media job attempt was superseded');
    const runId = ctx.run.id;
    async function stage(name: 'verify' | 'derivatives' | 'finalize', fields: Record<string, number | string> = {}) {
      const applied = await client.mutation(internal.mediaJobs.markStage, { jobId, attempt, runId, stage: name, ...fields });
      if (!applied) throw new Error('Media job attempt was superseded');
    }
    try {
      await stage('verify');
      const verified = await verifyMedia.triggerAndWait({ jobId }, { idempotencyKey: `${jobId}:${attempt}:verify` });
      if (!verified.ok) throw new Error('Verification stage failed');
      await stage('derivatives', verified.output);
      if (simulateFailure) throw new Error('Review Room ingest failure injection');
      const derivatives = await makeDerivatives.triggerAndWait({ jobId, probe: verified.output },
        { idempotencyKey: `${jobId}:${attempt}:derivatives` });
      if (!derivatives.ok) throw new Error('Derivative stage failed');
      await stage('finalize', { ...verified.output, ...derivatives.output });
      const finalized = await finalizeMedia.triggerAndWait({ jobId, attempt, runId,
        probe: verified.output, ...derivatives.output }, { idempotencyKey: `${jobId}:${attempt}:finalize` });
      if (!finalized.ok) throw new Error('Finalization stage failed');
      return finalized.output;
    } catch (cause) {
      await client.mutation(internal.mediaJobs.fail, { jobId, attempt, runId,
        error: cause instanceof Error ? cause.message : 'Media ingest failed' });
      throw cause;
    }
  },
});
