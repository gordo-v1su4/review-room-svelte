import { ConvexHttpClient } from 'convex/browser';
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server';
import { internal, api } from '../../../convex/_generated/api';
import { S3Client, CopyObjectCommand, DeleteObjectsCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { createMediaDelivery } from './media-delivery';
let convexClient: ConvexHttpClient | undefined;
let storageClient: S3Client | undefined;

export function db() {
  const url = env.REVIEW_ROOM_CONVEX_URL;
  const key = env.REVIEW_ROOM_CONVEX_ADMIN_KEY;
  if (!url || !key) throw error(503, 'Personal Review Room backend is not configured');
  if (url !== 'https://review-convex.v1su4.dev') throw error(503, 'Unexpected Review Room backend target');
  const client = convexClient ??= new ConvexHttpClient(url);
  (client as ConvexHttpClient & { setAdminAuth(token: string): void }).setAdminAuth(key);
  return {
    query<T extends FunctionReference<'query', 'public' | 'internal'>>(ref: T, args: FunctionArgs<T>): Promise<FunctionReturnType<T>> {
      return client.query(ref as never, args as never) as Promise<FunctionReturnType<T>>;
    },
    mutation<T extends FunctionReference<'mutation', 'public' | 'internal'>>(ref: T, args: FunctionArgs<T>): Promise<FunctionReturnType<T>> {
      return client.mutation(ref as never, args as never) as Promise<FunctionReturnType<T>>;
    }
  };
}

export const personal = internal.personal;
export const review = api.reviewPublic;
export const links = api.reviewLinks;

export function storage() {
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY || !env.S3_BUCKET) {
    throw error(503, 'Personal Review Room storage is not configured');
  }
  if (env.S3_ENDPOINT !== 'https://s3.v1su4.dev' || env.S3_BUCKET !== 'review-room-svelte') {
    throw error(503, 'Unexpected Review Room storage target');
  }
  return storageClient ??= new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION || 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
  });
}

function bucket() { return env.S3_BUCKET || 'review-room-svelte'; }

export async function uploadUrl(key: string, mimeType: string) {
  return await getSignedUrl(storage(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: mimeType }), { expiresIn: 15 * 60 });
}

export function stagingKey(key: string) { return `${key}.pending`; }
export function posterKey(key: string) { return `${key.slice(0, key.lastIndexOf('/'))}/poster.jpg`; }

export async function sealOriginal(key: string, mimeType: string, sizeBytes: number, expectedSha256?: string) {
  const sourceKey = stagingKey(key);
  let source;
  try { source = await verifiedObject(sourceKey); }
  catch (cause) {
    if ((cause as { name?: string }).name === 'NoSuchKey') throw error(409, 'Upload has not reached storage');
    throw cause;
  }
  if (source.ContentLength !== sizeBytes || source.ContentType !== mimeType || !source.ETag) {
    throw error(409, 'Uploaded original did not match the session');
  }
  if (expectedSha256) {
    const staged = await storage().send(new GetObjectCommand({
      Bucket: bucket(), Key: sourceKey, IfMatch: source.ETag
    }));
    if (!staged.Body) throw error(409, 'Uploaded original did not match the session');
    const digest = createHash('sha256');
    let receivedBytes = 0;
    const reader = staged.Body.transformToWebStream().getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.byteLength;
        digest.update(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (receivedBytes !== sizeBytes || digest.digest('hex') !== expectedSha256) {
      throw error(409, 'Uploaded original did not match the session');
    }
  }
  await storage().send(new CopyObjectCommand({
    Bucket: bucket(), Key: key,
    CopySource: `${bucket()}/${sourceKey}`,
    CopySourceIfMatch: source.ETag,
    ContentType: mimeType,
    MetadataDirective: 'REPLACE'
  }));
  const sealed = await verifiedObject(key);
  if (sealed.ContentLength !== sizeBytes || sealed.ContentType !== mimeType) {
    throw error(409, 'Sealed original did not match the session');
  }
  return { sizeBytes, etag: sealed.ETag };
}

export async function sealPoster(key: string, sizeBytes: number) {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 5 * 1024 ** 2) {
    throw error(409, 'Poster size is invalid');
  }
  return sealOriginal(posterKey(key), 'image/jpeg', sizeBytes);
}

export async function removeUploadStaging(key: string) {
  await storage().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: [
    { Key: stagingKey(key) }, { Key: stagingKey(posterKey(key)) }
  ] } }));
}

export async function verifiedObject(key: string) {
  const result = await storage().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!result.Body) throw error(404, 'Original unavailable');
  await result.Body.transformToWebStream().cancel();
  return result;
}

const deliverMedia = createMediaDelivery(async (key, range) => {
  const result = await storage().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: range }));
  if (!result.Body || result.ContentLength === undefined) throw error(404, 'Media unavailable');
  return { body: result.Body.transformToWebStream(), length: result.ContentLength,
    range: result.ContentRange, etag: result.ETag };
});

export async function mediaResponse(key: string, mimeType: string, request: Request) {
  return deliverMedia(request, key, mimeType);
}
