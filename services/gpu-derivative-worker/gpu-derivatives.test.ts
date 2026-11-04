import { expect, test } from 'bun:test';
import { validateGpuRequest } from './gpu-derivatives';

const base = 'assets/ks7d3aqsgbrpz030qvkvha5rtd8ge2pm/videos/' + 'a'.repeat(64);
const valid = {
  originalKey: `${base}/original.mp4`,
  thumbnailKey: `${base}/versions/mh77gqwyypcnrf1j32ehs35c2n8hjhsf/thumbnail.jpg`,
  spriteKey: `${base}/versions/mh77gqwyypcnrf1j32ehs35c2n8hjhsf/sprite.jpg`,
  durationSec: 10,
  sizeBytes: 6_338_014,
};

test('accepts only derivatives beside the exact Review Room original and version', () => {
  expect(validateGpuRequest(valid)).toEqual(valid);
  expect(() => validateGpuRequest({ ...valid, spriteKey: `${base}/versions/another/sprite.jpg` })).toThrow('Invalid derivative keys');
  expect(() => validateGpuRequest({ ...valid, originalKey: 'assets/other/../original.mp4' })).toThrow('Invalid original key');
  expect(() => validateGpuRequest({ ...valid, durationSec: 0 })).toThrow('Invalid video metadata');
});
