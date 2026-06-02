import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

let client: S3Client | null = null;

export function getS3Client() {
  if (!client) {
    client = new S3Client({
      endpoint: requireEnv("S3_ENDPOINT"),
      region: process.env.S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    });
  }
  return client;
}

export function getBucket() {
  return requireEnv("S3_BUCKET");
}

export function buildObjectKey(projectId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const d = new Date();
  const prefix = `review-room-uploads/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}_${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${prefix}/${projectId}/${Date.now()}-${safe}`;
}

export async function createPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
}

export async function createPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
}

export function publicObjectUrl(key: string) {
  const base = process.env.S3_PUBLIC_BASE_URL ?? process.env.S3_ENDPOINT;
  if (!base) return null;
  const bucket = getBucket();
  return `${base.replace(/\/$/, "")}/${bucket}/${key}`;
}

export async function deleteObject(key: string) {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}
