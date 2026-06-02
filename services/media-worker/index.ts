/**
 * Homelab media worker — ffmpeg thumbnail + sprite sheet, callbacks to Convex HTTP.
 * Run: bun run worker:media
 */
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const PORT = Number(process.env.MEDIA_WORKER_PORT ?? 8787);
const SECRET = process.env.MEDIA_WORKER_SECRET || "dev";
const CONVEX_SITE =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  process.env.CONVEX_SITE_URL ??
  "https://unfold-site.serving.cloud";
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
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

async function processJob(body: {
  videoId: string;
  storageKey: string;
  sourceUrl: string;
}) {
  const workDir = join(tmpdir(), `rr-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });
  const input = join(workDir, "input.bin");
  const thumbKey = body.storageKey.replace(/\.[^.]+$/, "") + "-thumb.jpg";
  const spriteKey = body.storageKey.replace(/\.[^.]+$/, "") + "-sprite.jpg";

  try {
    const src = await fetch(body.sourceUrl);
    if (!src.ok) throw new Error("Failed to download source");
    await writeFile(input, Buffer.from(await src.arrayBuffer()));

    const thumbPath = join(workDir, "thumb.jpg");
    await runFfmpeg([
      "-y",
      "-i",
      input,
      "-ss",
      "00:00:01",
      "-vframes",
      "1",
      "-q:v",
      "2",
      thumbPath,
    ]);

    const spritePath = join(workDir, "sprite.jpg");
    await runFfmpeg([
      "-y",
      "-i",
      input,
      "-vf",
      "fps=1/2,scale=160:-1,tile=10x1",
      "-frames:v",
      "1",
      spritePath,
    ]);

    await uploadDerivative(thumbKey, await Bun.file(thumbPath).bytes());
    await uploadDerivative(spriteKey, await Bun.file(spritePath).bytes());

    await notifyConvex({
      videoId: body.videoId,
      thumbnailKey: thumbKey,
      spriteKey: spriteKey,
      error: false,
    });
  } catch {
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
      };
      void processJob(body);
      return Response.json({ queued: true });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Media worker listening on :${server.port}`);
