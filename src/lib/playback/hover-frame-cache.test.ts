import { describe, expect, test } from 'bun:test';
import { createHoverFrameCache, createHoverPreviewCoordinator } from './hover-frame-cache';

function frame() {
  return { width: 10, height: 10, closed: 0, close() { this.closed++; } };
}

describe('hover frame cache', () => {
  test('keeps recently viewed frames while releasing the least recently used under a shared memory limit', () => {
    const cache = createHoverFrameCache<ReturnType<typeof frame>>(800);
    const first = cache.retain('first');
    const second = cache.retain('second');
    const a = frame(); const b = frame(); const c = frame();
    first.set(0, a); first.set(1, b);
    expect(first.get(0)).toBe(a);
    second.set(0, c);
    expect(first.get(1)).toBeUndefined();
    expect(b.closed).toBe(1);
    expect(first.get(0)).toBe(a);
    expect(second.get(0)).toBe(c);
    first.release(); second.release();
  });
});

test('a second thumbnail of the same source preserves frames until the final owner leaves', () => {
  const cache = createHoverFrameCache<ReturnType<typeof frame>>();
  const first = cache.retain('shared'); const second = cache.retain('shared');
  const a = frame(); const late = frame();
  first.set(2, a);
  first.release(); first.release();
  expect(second.get(2)).toBe(a);
  expect(a.closed).toBe(0);
  first.set(3, late);
  expect(late.closed).toBe(1);
  second.release();
  expect(a.closed).toBe(1);
  expect(second.get(2)).toBeUndefined();
});

test('replacement and oversized frames are released without evicting usable previews', () => {
  const cache = createHoverFrameCache<ReturnType<typeof frame>>(400);
  const source = cache.retain('clip');
  const a = frame(); const b = frame(); const oversized = { ...frame(), width: 20 };
  source.set(0, a); source.set(0, b); source.set(1, oversized);
  expect(a.closed).toBe(1);
  expect(oversized.closed).toBe(1);
  expect(source.get(0)).toBe(b);
  source.release();
  expect(b.closed).toBe(1);
});


test('entering another card cancels the former decoder and stale cleanup cannot cancel the new one', () => {
  const coordinator = createHoverPreviewCoordinator();
  let firstStops = 0; let secondStops = 0;
  const first = coordinator.activate(() => { firstStops++; });
  const second = coordinator.activate(() => { secondStops++; });
  expect(firstStops).toBe(1);
  first();
  expect(secondStops).toBe(0);
  coordinator.activate(() => {});
  expect(secondStops).toBe(1);
  second();
});
