import { expect, test } from 'bun:test';
import { retryStorage } from './storageRetry';

test('a temporary opaque S3 403 is retried and the operation completes', async () => {
  let attempts = 0;
  const result = await retryStorage(async () => {
    if (++attempts < 3) throw Object.assign(new Error('UnknownError'), { name: 'Unknown', $metadata: { httpStatusCode: 403 } });
    return 'stored';
  }, { wait: async () => {} });
  expect(result).toBe('stored');
  expect(attempts).toBe(3);
});

test('permanent authorization errors are not retried and opaque errors are bounded', async () => {
  let attempts = 0;
  await expect(retryStorage(async () => {
    attempts++;
    throw Object.assign(new Error('SignatureDoesNotMatch'), { name: 'SignatureDoesNotMatch', $metadata: { httpStatusCode: 403 } });
  }, { wait: async () => {} })).rejects.toThrow('SignatureDoesNotMatch');
  expect(attempts).toBe(1);
  attempts = 0;
  await expect(retryStorage(async () => {
    attempts++;
    throw Object.assign(new Error('UnknownError'), { name: 'Unknown', $metadata: { httpStatusCode: 403 } });
  }, { wait: async () => {} })).rejects.toThrow('UnknownError');
  expect(attempts).toBe(5);
});
