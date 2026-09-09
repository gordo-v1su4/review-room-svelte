"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { isImageAsset } from "@/lib/media";
import type { AssetClass } from "@/lib/types";
import { cn } from "@/lib/utils";

export function VideoPlayer({
  storageKey,
  spriteKey: _spriteKey,
  posterKey,
  mimeType,
  assetClass,
  version: _version,
  fps,
  loop = false,
  autoPlay = false,
  fitAvailable = false,
  width,
  height,
  onTimeUpdate,
  onPlay,
  onEnded,
  seekTo,
}: {
  storageKey: string;
  spriteKey?: string;
  posterKey?: string | null;
  mimeType?: string | null;
  assetClass?: AssetClass | null;
  version?: string | number | null;
  fps?: number | null;
  loop?: boolean;
  autoPlay?: boolean;
  fitAvailable?: boolean;
  width?: number | null;
  height?: number | null;
  onTimeUpdate?: (sec: number) => void;
  onPlay?: () => void;
  onEnded?: () => void;
  seekTo?: number | null;
}) {
  // Playback URL is keyed only by the object, never by updatedAt/version.
  // A later re-presign or metadata write must not reload the element.
  const mediaUrl = useStorageUrl(storageKey);
  const posterUrl = useStorageUrl(posterKey);
  const isImage = isImageAsset({
    mimeType: mimeType ?? "application/octet-stream",
    assetClass,
  });
  const ref = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const boundKeyRef = useRef<string | null>(null);
  const boundUrlRef = useRef<string | null>(null);
  const onPlayRef = useRef(onPlay);
  const onEndedRef = useRef(onEnded);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onPlayRef.current = onPlay;
  onEndedRef.current = onEnded;
  onTimeUpdateRef.current = onTimeUpdate;
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [displayMode, setDisplayMode] = useState<"timecode" | "frames">("timecode");
  const [playbackAspect, setPlaybackAspect] = useState<number | null>(
    width && height && width > 0 && height > 0 ? width / height : null,
  );
  const [frameReady, setFrameReady] = useState(false);
  const mediaAspect = playbackAspect ?? 1;
  const mediaAspectStyle = { aspectRatio: `${mediaAspect}` };
  const frameRate = Number.isFinite(fps ?? NaN) && (fps ?? 0) > 0 ? fps ?? 24 : 24;
  const totalFrames = Math.max(0, Math.round(duration * frameRate));
  const currentFrame = Math.min(
    totalFrames,
    Math.max(0, Math.floor(currentTime * frameRate)),
  );
  const readout =
    displayMode === "timecode"
      ? `${formatEditorialTimecode(currentTime, frameRate)} / ${formatEditorialTimecode(duration, frameRate)}`
      : `${currentFrame.toLocaleString()} / ${totalFrames.toLocaleString()} fr`;

  useEffect(() => {
    if (seekTo != null && ref.current) {
      ref.current.currentTime = seekTo;
      syncTime(seekTo);
    }
  }, [seekTo]);

  useEffect(() => {
    setIsMuted(true);
    setFrameReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    boundKeyRef.current = null;
    boundUrlRef.current = null;
    const video = ref.current;
    if (video) {
      video.muted = true;
      video.removeAttribute("src");
      video.load();
    }
    if (width && height && width > 0 && height > 0) {
      setPlaybackAspect(width / height);
    }
    // Only the file identity should reset playback. Width/height updates
    // and a later signed URL must not rewind the playhead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !mediaUrl || isImage) return;
    if (boundKeyRef.current === storageKey && boundUrlRef.current === mediaUrl) {
      return;
    }
    boundKeyRef.current = storageKey;
    boundUrlRef.current = mediaUrl;
    video.src = mediaUrl;
    if (autoPlay) playVideo(video);
  }, [autoPlay, isImage, mediaUrl, storageKey]);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function syncTime(nextTime?: number) {
    const time = nextTime ?? ref.current?.currentTime ?? 0;
    setCurrentTime(time);
    onTimeUpdateRef.current?.(time);
  }

  function startTicker() {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    const tick = () => {
      const video = ref.current;
      if (!video) return;
      syncTime(video.currentTime);
      if (!video.paused && !video.ended) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  function stopTicker() {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    syncTime();
  }

  function seekFromClientX(clientX: number) {
    if (isImage) return;
    if (!timelineRef.current || !ref.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const nextTime = pct * duration;
    ref.current.currentTime = nextTime;
    syncTime(nextTime);
  }

  function playVideo(video: HTMLVideoElement) {
    video.play().catch((error: unknown) => {
      if (
        error instanceof DOMException &&
        error.name === "AbortError" &&
        error.message.includes("interrupted")
      ) {
        return;
      }
      console.error("Video playback failed", error);
    });
  }

  function togglePlayback() {
    if (isImage) return;
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      playVideo(video);
    } else {
      video.pause();
    }
  }

  function toggleMuted() {
    setIsMuted((muted) => {
      const nextMuted = !muted;
      if (ref.current) ref.current.muted = nextMuted;
      return nextMuted;
    });
  }

  return (
    <div
      className={cn(
        fitAvailable
          ? "flex h-full min-h-0 flex-col gap-3"
          : "space-y-3",
      )}
    >
      <div
        className={cn(
          "group relative overflow-hidden rounded-lg bg-black",
          fitAvailable && "flex min-h-0 flex-1 items-center justify-center",
        )}
      >
        {isImage ? (
          mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt=""
              className={cn(
                "object-contain",
                fitAvailable ? "max-h-full max-w-full" : "w-full",
              )}
              style={mediaAspectStyle}
              onLoad={() => onPlayRef.current?.()}
            />
          ) : (
            <div
              className={cn(
                "flex w-full items-center justify-center text-sm text-zinc-500",
                fitAvailable && "h-full",
              )}
              style={fitAvailable ? undefined : mediaAspectStyle}
            >
              Loading playback…
            </div>
          )
        ) : (
          <>
            <video
              ref={ref}
              loop={loop}
              muted={isMuted}
              playsInline
              preload="auto"
              className={cn(
                "object-contain",
                fitAvailable ? "max-h-full max-w-full" : "w-full",
              )}
              style={mediaAspectStyle}
              onClick={togglePlayback}
              onPlay={() => {
                setIsPlaying(true);
                onPlayRef.current?.();
                startTicker();
              }}
              onPlaying={() => setFrameReady(true)}
              onPause={() => {
                setIsPlaying(false);
                stopTicker();
              }}
              onTimeUpdate={(e) => {
                syncTime(e.currentTarget.currentTime);
              }}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration);
                syncTime(e.currentTarget.currentTime);
                const nextWidth = e.currentTarget.videoWidth;
                const nextHeight = e.currentTarget.videoHeight;
                if (nextWidth > 0 && nextHeight > 0) {
                  setPlaybackAspect(nextWidth / nextHeight);
                }
              }}
              onLoadedData={() => {
                if (!autoPlay) setFrameReady(true);
              }}
              onSeeking={(e) => syncTime(e.currentTarget.currentTime)}
              onSeeked={(e) => syncTime(e.currentTarget.currentTime)}
              onEnded={() => {
                setIsPlaying(false);
                stopTicker();
                onEndedRef.current?.();
              }}
            />
            {posterUrl && !frameReady ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            ) : null}
            {!posterUrl && !frameReady ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-500",
                )}
              >
                Loading playback…
              </div>
            ) : null}
          </>
        )}
      </div>
      {!isImage && (
        <div className={cn("space-y-3 px-5 pb-4 pt-1", fitAvailable && "shrink-0")}>
        <div
          ref={timelineRef}
          role="slider"
          aria-label="Video timeline"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, duration)}
          aria-valuenow={currentTime}
          tabIndex={0}
          className={cn(
            "relative h-6 cursor-ew-resize touch-none rounded-full py-2.5",
            isScrubbing && "cursor-grabbing",
          )}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsScrubbing(true);
            seekFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (isScrubbing) seekFromClientX(e.clientX);
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setIsScrubbing(false);
            seekFromClientX(e.clientX);
          }}
          onPointerCancel={() => {
            setIsScrubbing(false);
          }}
          onKeyDown={(e) => {
            if (!ref.current || !duration) return;
            const frameStep = 1 / frameRate;
            const step =
              e.key === "ArrowLeft"
                ? -frameStep
                : e.key === "ArrowRight"
                  ? frameStep
                  : e.key === "Home"
                    ? -duration
                    : e.key === "End"
                      ? duration
                      : 0;
            if (!step) return;
            e.preventDefault();
            const nextTime =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? duration
                  : Math.min(duration, Math.max(0, ref.current.currentTime + step));
            ref.current.currentTime = nextTime;
            syncTime(nextTime);
          }}
        >
          <div
            className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-zinc-800"
          >
            <div
              className="h-full rounded-full bg-teal-400 shadow-[0_0_14px_rgba(45,212,191,0.35)]"
              style={{
                width: `${(currentTime / (duration || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 text-xs text-zinc-500">
          <button
            type="button"
            onClick={togglePlayback}
            className="inline-flex h-7 w-20 shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/70 px-2 font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            {isPlaying ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3 fill-current" />
            )}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
            aria-pressed={isMuted}
            title={isMuted ? "Unmute video" : "Mute video"}
            onClick={toggleMuted}
            className="inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-300/70"
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              setDisplayMode((mode) =>
                mode === "timecode" ? "frames" : "timecode",
              )
            }
            aria-label={
              displayMode === "timecode" ? "Show frames" : "Show timecode"
            }
            title={
              displayMode === "timecode" ? "Show frames" : "Show timecode"
            }
            className="inline-flex h-7 min-w-0 items-center truncate rounded-md px-1.5 font-mono text-[12px] tabular-nums text-zinc-400 transition hover:bg-zinc-900 hover:text-teal-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-300/70"
          >
            {readout}
          </button>
        </div>
        </div>
      )}
    </div>
  );
}

function formatEditorialTimecode(sec: number, fps: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00:00:00";
  const frameBase = Math.max(1, Math.round(fps));
  const totalFrames = Math.max(0, Math.floor(sec * frameBase));
  const frames = totalFrames % frameBase;
  const totalSeconds = Math.floor(totalFrames / frameBase);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}
