import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Read links for automation clients stay valid long enough to start a download, not to be shared. */
export const READ_URL_TTL_SECONDS = 10 * 60;

export type VersionMediaKeys = { originalKey: string; posterKey: string | null; mimeType: string; sizeBytes: number };
export type SignedVersionMedia = {
  original: { url: string; mimeType: string; sizeBytes: number; expiresAt: number };
  poster: { url: string; expiresAt: number } | null;
};

/** Short-lived GET URLs for a version's original and (when present) its JPEG poster. */
export async function signVersionMedia(client: S3Client, bucket: string, media: VersionMediaKeys, now = Date.now(), ttlSeconds = READ_URL_TTL_SECONDS): Promise<SignedVersionMedia> {
  const expiresAt = now + ttlSeconds * 1000;
  const sign = (key: string, contentType: string) => getSignedUrl(client,
    new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentType: contentType }), { expiresIn: ttlSeconds, signingDate: new Date(now) });
  return {
    original: { url: await sign(media.originalKey, media.mimeType), mimeType: media.mimeType, sizeBytes: media.sizeBytes, expiresAt },
    poster: media.posterKey ? { url: await sign(media.posterKey, 'image/jpeg'), expiresAt } : null,
  };
}
