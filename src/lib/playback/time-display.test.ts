import { expect, test } from 'bun:test';
import { frameStepTarget, frameReadout, validFrameRate } from './time-display';

test('frame stepping uses measured fractional fps and clamps at clip bounds', () => {
  expect(frameStepTarget(1, 10, 29.97, 1)).toBeCloseTo(1 + 1 / 29.97);
  expect(frameStepTarget(0, 10, 24, -1)).toBe(0);
  expect(frameStepTarget(9.99, 10, 24, 1)).toBe(10);
});
test('missing or invalid fps never invents a frame rate', () => {
  for (const fps of [undefined, 0, -1, NaN, Infinity]) {
    expect(validFrameRate(fps)).toBe(false);
    expect(frameStepTarget(1, 10, fps, 1)).toBeNull();
    expect(frameReadout(1, 10, fps)).toBe('Frames unavailable');
  }
});
test('frame display reports zero-based position and estimated fps', () => {
  expect(frameReadout(1.5, 10, 24)).toBe('36 / 240 · ≈24 fps');
  expect(frameReadout(11, 10, 29.97)).toBe('300 / 300 · ≈29.97 fps');
});

test('native microsecond rounding does not display the previous frame at a boundary', () => {
  expect(frameReadout(0.041666, 10, 24)).toBe('1 / 240 · ≈24 fps');
  expect(frameReadout(0.083333, 10, 24)).toBe('2 / 240 · ≈24 fps');
  expect(frameReadout(0.041, 10, 24)).toBe('0 / 240 · ≈24 fps');
});
