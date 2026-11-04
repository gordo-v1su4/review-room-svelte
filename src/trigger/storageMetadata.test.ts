import { expect, test } from 'bun:test';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getObjectMetadata } from './storageMetadata';

test('checks object metadata with GET and closes the unused body', async () => {
  const sent: unknown[] = [];
  let closed = false;
  const client = {
    send: async (command: unknown, options: { abortSignal: AbortSignal }) => {
      sent.push(command);
      expect(options.abortSignal).toBeInstanceOf(AbortSignal);
      return { ContentLength: 42, ContentType: 'video/mp4', ETag: 'etag', Body: { destroy: () => { closed = true; } } };
    },
  } as unknown as S3Client;

  expect(await getObjectMetadata(client, 'bucket', 'original.mp4')).toEqual({
    ContentLength: 42, ContentType: 'video/mp4', ETag: 'etag',
  });
  expect(sent).toHaveLength(1);
  expect(sent[0]).toBeInstanceOf(GetObjectCommand);
  expect(closed).toBe(true);
});
