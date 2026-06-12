/**
 * Homelab media worker — ffmpeg thumbnail + sprite sheet, callbacks to Convex HTTP.
 * Run: bun run worker:media
 */
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const PORT = Number(process.env.MEDIA_WORKER_PORT ?? 8787);
const SECRET = process.env.MEDIA_WORKER_SECRET || "dev";
const CONVEX_SITE =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  process.env.CONVEX_SITE_URL ??
  "https://unfold-site.serving.cloud";
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";
const S3_BUCKET = process.env.S3_BUCKET;

let s3: S3Client | null = null;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getS3Client() {
  if (!s3) {
    s3 = new S3Client({
      endpoint: requireEnv("S3_ENDPOINT"),
      region: process.env.S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    });
  }
  return s3;
}

async function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { stdio: "ignore" });
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)),
    );
  });
}

async function runProcess(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    proc.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`${command} exit ${code}: ${stderr}`)),
    );
  });
}

async function probeVideo(input: string) {
  const raw = await runProcess(FFPROBE, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,avg_frame_rate,r_frame_rate:format=duration",
    "-of",
    "json",
    input,
  ]);
  const parsed = JSON.parse(raw) as {
    streams?: {
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      r_frame_rate?: string;
    }[];
    format?: { duration?: string };
  };
  const durationSec = Number(parsed.format?.duration);
  const frameRate =
    parseFrameRate(parsed.streams?.[0]?.avg_frame_rate) ??
    parseFrameRate(parsed.streams?.[0]?.r_frame_rate);
  return {
    durationSec: Number.isFinite(durationSec) && durationSec > 0 ? durationSec : undefined,
    width: parsed.streams?.[0]?.width,
    height: parsed.streams?.[0]?.height,
    fps: frameRate,
  };
}

function parseFrameRate(value?: string) {
  if (!value) return undefined;
  const [numRaw, denRaw] = value.split("/");
  const num = Number(numRaw);
  const den = Number(denRaw ?? 1);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return undefined;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? fps : undefined;
}

async function generateSprite(input: string, workDir: string, durationSec?: number) {
  const frameCount = 10;
  const safeDuration = durationSec && durationSec > 0 ? durationSec : 1;

  for (let index = 0; index < frameCount; index++) {
    const midpoint = (safeDuration * (index + 0.5)) / frameCount;
    const seekSec = Math.max(0, Math.min(safeDuration - 0.05, midpoint));
    await runFfmpeg([
      "-y",
      "-ss",
      seekSec.toFixed(3),
      "-i",
      input,
      "-vframes",
      "1",
      "-vf",
      "scale=320:-1",
      "-q:v",
      "3",
      join(workDir, `sprite-frame-${String(index).padStart(2, "0")}.jpg`),
    ]);
  }

  const spritePath = join(workDir, "sprite.jpg");
  await runFfmpeg([
    "-y",
    "-framerate",
    "1",
    "-i",
    join(workDir, "sprite-frame-%02d.jpg"),
    "-vf",
    "tile=10x1",
    "-frames:v",
    "1",
    spritePath,
  ]);

  return spritePath;
}

async function notifyConvex(payload: Record<string, unknown>) {
  const res = await fetch(`${CONVEX_SITE}/media/process-complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SECRET}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Convex callback failed: ${await res.text()}`);
}

async function uploadDerivative(key: string, bytes: Uint8Array) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: S3_BUCKET ?? requireEnv("S3_BUCKET"),
      Key: key,
      Body: bytes,
      ContentType: "image/jpeg",
    }),
  );
}

async function deleteDerivative(key?: string) {
  if (!key) return;
  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET ?? requireEnv("S3_BUCKET"),
        Key: key,
      }),
    );
  } catch (error) {
    console.warn(`Could not delete old derivative ${key}`, error);
  }
}

async function processJob(body: {
  videoId: string;
  storageKey: string;
  sourceUrl: string;
  previousThumbnailKey?: string;
  previousSpriteKey?: string;
}) {
  const workDir = join(tmpdir(), `rr-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });
  const input = join(workDir, "input.bin");
  const derivativeBase = body.storageKey.replace(/\.[^.]+$/, "");
  const derivativeRun = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const thumbKey = `${derivativeBase}-thumb-${derivativeRun}.jpg`;
  const spriteKey = `${derivativeBase}-sprite-${derivativeRun}.jpg`;

  try {
    const src = await fetch(body.sourceUrl);
    if (!src.ok) throw new Error("Failed to download source");
    await writeFile(input, Buffer.from(await src.arrayBuffer()));

    const probe = await probeVideo(input);
    const thumbPath = join(workDir, "thumb.jpg");
    await runFfmpeg([
      "-y",
      "-ss",
      String(Math.min(1, Math.max(0, (probe.durationSec ?? 2) / 2))),
      "-i",
      input,
      "-vframes",
      "1",
      "-q:v",
      "2",
      thumbPath,
    ]);

    const spritePath = await generateSprite(input, workDir, probe.durationSec);

    await uploadDerivative(thumbKey, await Bun.file(thumbPath).bytes());
    await uploadDerivative(spriteKey, await Bun.file(spritePath).bytes());
    await Promise.all([
      deleteDerivative(body.previousThumbnailKey),
      deleteDerivative(body.previousSpriteKey),
    ]);

    await notifyConvex({
      videoId: body.videoId,
      thumbnailKey: thumbKey,
      spriteKey: spriteKey,
      durationSec: probe.durationSec,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      error: false,
    });
  } catch (error) {
    console.error(error);
    await notifyConvex({
      videoId: body.videoId,
      error: true,
    });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/process") {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      const body = (await req.json()) as {
        videoId: string;
        storageKey: string;
        sourceUrl: string;
        previousThumbnailKey?: string;
        previousSpriteKey?: string;
      };
      void processJob(body);
      return Response.json({ queued: true });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Media worker listening on :${server.port}`);
