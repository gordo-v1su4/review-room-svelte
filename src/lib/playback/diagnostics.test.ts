import { expect, test } from 'bun:test';
import { observeNativePlayback, type PlaybackMetrics } from './diagnostics';

test('measures loaded data and latest seek, resets per load and ignores disposed events', () => {
  let now = 100;
  const media = Object.assign(new EventTarget(), { currentTime: 0, seeking: false, readyState: 2,
    getVideoPlaybackQuality: () => ({ totalVideoFrames: 100, droppedVideoFrames: 3 }) });
  let metrics: PlaybackMetrics | undefined;
  const monitor = observeNativePlayback(media, next => metrics = next, () => now);
  media.dispatchEvent(new Event('loadstart'));
  now = 145; media.dispatchEvent(new Event('loadeddata'));
  expect(metrics?.firstLoadedFrameMs).toBe(45);
  monitor.requestSeek(2); now = 150; monitor.requestSeek(4);
  now = 172; media.currentTime = 4; media.dispatchEvent(new Event('seeked'));
  expect(metrics?.lastSeekMs).toBe(22);
  expect(metrics?.droppedFrames).toBe(3);
  media.dispatchEvent(new Event('loadstart'));
  expect(metrics?.firstLoadedFrameMs).toBeNull(); expect(metrics?.lastSeekMs).toBeNull();
  monitor.dispose(); now = 200; media.dispatchEvent(new Event('loadeddata'));
  expect(metrics?.firstLoadedFrameMs).toBeNull();
});
