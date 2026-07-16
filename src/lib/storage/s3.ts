import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
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

export async function createMultipartUpload(key: string, contentType: string) {
  const result = await getS3Client().send(
    new CreateMultipartUploadCommand({
      Bucket: getBucket(),
      Key: key,
      ContentType: contentType,
    }),
  );
  if (!result.UploadId) throw new Error("Storage did not return a multipart upload ID");
  return result.UploadId;
}

export async function createPresignedPartUploadUrl(
  key: string,
  uploadId: string,
  partNumber: number,
) {
  const command = new UploadPartCommand({
    Bucket: getBucket(),
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ ETag: string; PartNumber: number }>,
) {
  await getS3Client().send(
    new CompleteMultipartUploadCommand({
      Bucket: getBucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  await getS3Client().send(
    new AbortMultipartUploadCommand({
      Bucket: getBucket(),
      Key: key,
      UploadId: uploadId,
    }),
  );
}

export async function createPresignedDownloadUrl(key: string, filename?: string) {
  const safeFilename = filename?.replace(/[\r\n"]/g, "").trim();
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ResponseContentDisposition: safeFilename
      ? `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
      : undefined,
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
