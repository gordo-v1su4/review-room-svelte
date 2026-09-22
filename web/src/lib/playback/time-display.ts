/** Frame positions use the detected average rate; variable-rate files remain approximate. */
export function validFrameRate(fps: number | undefined): fps is number {
  return typeof fps === 'number' && Number.isFinite(fps) && fps > 0;
}
export function frameStepTarget(time: number, duration: number, fps: number | undefined, direction: -1 | 1): number | null {
  if (!validFrameRate(fps) || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return null;
  return Math.max(0, Math.min(duration, time + direction / fps));
}
export function frameReadout(time: number, duration: number, fps: number | undefined): string {
  if (!validFrameRate(fps)) return 'Frames unavailable';
  const total = Math.max(0, Math.round((Number.isFinite(duration) ? duration : 0) * fps));
  // Native currentTime can truncate a sought frame boundary to microseconds.
  // A one-microsecond display tolerance preserves floor semantics elsewhere.
  const current = Math.min(total, Math.max(0, Math.floor(((Number.isFinite(time) ? time : 0) + 0.000001) * fps)));
  return `${current} / ${total} · ≈${Number(fps.toFixed(2))} fps`;
}
