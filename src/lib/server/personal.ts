import { ConvexHttpClient } from 'convex/browser';
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server';
import { internal, api } from '../../../convex/_generated/api';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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
  const result = await storage().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!result.Body) throw error(404, 'Original unavailable');
  await result.Body.transformToWebStream().cancel();
  return result;
}

export async function mediaResponse(key: string, mimeType: string, range?: string) {
  try {
    const result = await storage().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    if (!result.Body || result.ContentLength === undefined) throw error(404, 'Media unavailable');
    const total = result.ContentLength;
    let start = 0;
    let end = total - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        await result.Body.transformToWebStream().cancel();
        return new Response(null, { status: 416, headers: { 'content-range': `bytes */${total}` } });
      }
      if (match[1]) { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1; }
      else { start = Math.max(0, total - Number(match[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= total) {
        await result.Body.transformToWebStream().cancel();
        return new Response(null, { status: 416, headers: { 'content-range': `bytes */${total}` } });
      }
    }
    const headers = new Headers({
      'content-type': mimeType,
      'accept-ranges': 'bytes',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'same-origin'
    });
    headers.set('content-length', String(end - start + 1));
    if (range) headers.set('content-range', `bytes ${start}-${end}/${total}`);
    const source = result.Body.transformToWebStream().getReader();
    let offset = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        while (offset <= end) {
          const { done, value } = await source.read();
          if (done) { controller.close(); return; }
          const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
          const from = Math.max(0, start - offset);
          const to = Math.min(chunk.length, end - offset + 1);
          offset += chunk.length;
          if (from < to) { controller.enqueue(chunk.subarray(from, to)); return; }
        }
        await source.cancel();
        controller.close();
      },
      async cancel() { await source.cancel(); }
    });
    return new Response(body, { status: range ? 206 : 200, headers });
  } catch (cause) {
    if ((cause as { name?: string }).name === 'NoSuchKey') throw error(404, 'Media unavailable');
    throw cause;
  }
}
