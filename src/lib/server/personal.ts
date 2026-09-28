import { ConvexHttpClient } from 'convex/browser';
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server';
import { internal, api } from '../../../convex/_generated/api';
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

export function db() {
  const url = env.REVIEW_ROOM_CONVEX_URL;
  const key = env.REVIEW_ROOM_CONVEX_ADMIN_KEY;
  if (!url || !key) throw error(503, 'Personal Review Room backend is not configured');
  const client = new ConvexHttpClient(url);
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
  return new S3Client({
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

export async function verifiedObject(key: string) {
  return await storage().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function mediaResponse(key: string, mimeType: string, range?: string) {
  try {
    const result = await storage().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: range }));
    if (!result.Body) throw error(404, 'Media unavailable');
    const headers = new Headers({
      'content-type': mimeType,
      'accept-ranges': 'bytes',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'same-origin'
    });
    if (result.ContentLength !== undefined) headers.set('content-length', String(result.ContentLength));
    if (result.ContentRange) headers.set('content-range', result.ContentRange);
    return new Response(result.Body.transformToWebStream() as ReadableStream, { status: result.ContentRange ? 206 : 200, headers });
  } catch (cause) {
    if ((cause as { name?: string }).name === 'NoSuchKey') throw error(404, 'Media unavailable');
    throw cause;
  }
}
