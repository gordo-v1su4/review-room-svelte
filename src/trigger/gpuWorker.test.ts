import { expect, test } from 'bun:test';
import { requestGpuDerivatives } from './gpuWorker';

const request = {
  originalKey: 'assets/project/videos/digest/original.mp4',
  thumbnailKey: 'assets/project/videos/digest/versions/version/thumbnail.jpg',
  spriteKey: 'assets/project/videos/digest/versions/version/sprite.jpg',
  durationSec: 10,
  sizeBytes: 6_338_014,
};

test('sends one authenticated derivative job to the serial GPU worker', async () => {
  let calls = 0;
  await requestGpuDerivatives(request, {
    url: 'http://192.168.8.222:18098/derivatives', secret: 'test-secret',
    fetcher: async (url, init) => {
      calls++;
      expect(url).toBe('http://192.168.8.222:18098/derivatives');
      expect(init?.method).toBe('POST');
      expect(init?.headers).toEqual({ authorization: 'Bearer test-secret', 'content-type': 'application/json' });
      expect(JSON.parse(String(init?.body))).toEqual(request);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return Response.json({ ok: true });
    },
  });
  expect(calls).toBe(1);
});

test('GPU worker failures end the derivative stage without CPU fallback', async () => {
  await expect(requestGpuDerivatives(request, {
    url: 'http://192.168.8.222:18098/derivatives', secret: 'test-secret',
    fetcher: async () => new Response('GPU unavailable', { status: 503 }),
  })).rejects.toThrow('GPU worker returned 503');
});
