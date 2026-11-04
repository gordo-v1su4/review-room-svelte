import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { retryStorage } from './storageRetry';

/** Read metadata through GET because scoped RustFS HEAD requests can return opaque 403s. */
export async function getObjectMetadata(client: S3Client, bucket: string, key: string) {
  return await retryStorage(async signal => {
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: signal });
    const body = object.Body;
    if (body && 'destroy' in body && typeof body.destroy === 'function') body.destroy();
    else if (body && 'cancel' in body && typeof body.cancel === 'function') await body.cancel();
    return { ContentLength: object.ContentLength, ContentType: object.ContentType, ETag: object.ETag };
  });
}
