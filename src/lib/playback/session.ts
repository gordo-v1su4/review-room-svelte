/** The browser media element is the external playback port. No UI state belongs here. */
export interface MediaPort {
  currentTime: number;
  duration: number;
  muted: boolean;
  paused: boolean;
  pause(): void;
  play(): Promise<void>;
}
export function createPlaybackSession(media: MediaPort) {
  let scrub: { muted: boolean; resume: boolean } | undefined;
  let disposed = false;
  function seek(time: number) {
    if (!disposed && Number.isFinite(time) && Number.isFinite(media.duration) && media.duration > 0)
      media.currentTime = Math.max(0, Math.min(time, media.duration));
  }
  return {
    seek,
    beginScrub() {
      if (disposed || scrub) return;
      scrub = { muted: media.muted, resume: !media.paused };
      media.pause(); media.muted = true;
    },
    scrubTo: seek,
    cancelScrub() {
      if (disposed) return;
      const previous = scrub; scrub = undefined;
      if (previous) media.muted = previous.muted;
      media.pause();
    },
    async endScrub(time: number) {
      const previous = scrub; scrub = undefined;
      if (!previous) return;
      seek(time);
      media.muted = previous.muted;
      if (previous.resume) await media.play();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (scrub) media.muted = scrub.muted;
      scrub = undefined;
      media.pause();
    },
  };
}
