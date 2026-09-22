import { describe, expect, test } from 'bun:test';
import { createPlaybackSession, type MediaPort } from './session';
function media(overrides: Partial<MediaPort> = {}): MediaPort {
  return { currentTime: 2, duration: 10, muted: false, paused: false, pause() { this.paused = true; }, async play() { this.paused = false; }, ...overrides };
}
describe('review playback scrubbing', () => {
  test('a duplicate release cannot move playback after the drag ended', async () => {
    const video = media(); const session = createPlaybackSession(video);
    session.beginScrub(); await session.endScrub(4);
    await session.endScrub(8);
    expect(video.currentTime).toBe(4);
  });
  test('discarding a scrub restores mute and makes stale input harmless to the next clip', async () => {
    const video = media(); const session = createPlaybackSession(video);
    session.beginScrub(); session.scrubTo(6); session.dispose();
    expect(video.muted).toBe(false); expect(video.paused).toBe(true);
    video.currentTime = 0;
    session.beginScrub(); session.scrubTo(8); await session.endScrub(9);
    session.seek(5);
    expect(video.currentTime).toBe(0); expect(video.muted).toBe(false); expect(video.paused).toBe(true);
  });
  test('follows the drag silently and resumes at the release position', async () => {
    const video = media(); const session = createPlaybackSession(video);
    session.beginScrub(); session.scrubTo(6);
    expect(video.currentTime).toBe(6); expect(video.muted).toBe(true); expect(video.paused).toBe(true);
    await session.endScrub(7.5);
    expect(video.currentTime).toBe(7.5); expect(video.muted).toBe(false); expect(video.paused).toBe(false);
  });
});

test('canceling a scrub restores mute without resuming and preserves the reusable session', async () => {
  let plays = 0;
  const video = media({ async play() { plays++; this.paused = false; } });
  const session = createPlaybackSession(video);
  session.beginScrub(); session.scrubTo(6);
  session.cancelScrub();
  expect(video.muted).toBe(false);
  expect(video.paused).toBe(true);
  await session.endScrub(9);
  expect(video.currentTime).toBe(6);
  expect(plays).toBe(0);
  session.seek(6.04);
  expect(video.currentTime).toBe(6.04);
  await video.play();
  session.beginScrub(); session.scrubTo(7);
  await session.endScrub(8);
  expect(video.currentTime).toBe(8);
  expect(video.paused).toBe(false);
  expect(video.muted).toBe(false);
  session.beginScrub(); session.dispose();
  expect(video.muted).toBe(false);
  expect(video.paused).toBe(true);
});
