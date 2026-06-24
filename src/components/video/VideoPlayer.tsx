"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { isImageAsset } from "@/lib/media";
import type { AssetClass } from "@/lib/types";
import { cn } from "@/lib/utils";

export function VideoPlayer({
  storageKey,
  spriteKey,
  mimeType,
  assetClass,
  version,
  fps,
  loop = false,
  autoPlay = false,
  onTimeUpdate,
  onPlay,
  onEnded,
  seekTo,
}: {
  storageKey: string;
  spriteKey?: string;
  mimeType?: string | null;
  assetClass?: AssetClass | null;
  version?: string | number | null;
  fps?: number | null;
  loop?: boolean;
  autoPlay?: boolean;
  onTimeUpdate?: (sec: number) => void;
  onPlay?: () => void;
  onEnded?: () => void;
  seekTo?: number | null;
}) {
  const mediaUrl = useStorageUrl(storageKey, version);
  const spriteUrl = useStorageUrl(spriteKey, version);
  const isImage = isImageAsset({
    mimeType: mimeType ?? "application/octet-stream",
    assetClass,
  });
  const ref = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayMode, setDisplayMode] = useState<"timecode" | "frames">("timecode");
  const [spriteAspect, setSpriteAspect] = useState<number | null>(null);
  const frameRate = Number.isFinite(fps ?? NaN) && (fps ?? 0) > 0 ? fps ?? 24 : 24;
  const totalFrames = Math.max(0, Math.round(duration * frameRate));
  const currentFrame = Math.min(
    totalFrames,
    Math.max(0, Math.floor(currentTime * frameRate)),
  );
  const spriteFrameCount = 10;
  const hoverFrame =
    hoverPct == null
      ? 0
      : Math.min(
          spriteFrameCount - 1,
          Math.max(0, Math.floor(hoverPct * spriteFrameCount)),
        );
  const hoverFramePosition =
    spriteFrameCount <= 1 ? 0 : (hoverFrame / (spriteFrameCount - 1)) * 100;
  const spritePreviewHeight = 96;
  const spritePreviewWidth = spriteAspect
    ? Math.max(44, Math.min(172, spritePreviewHeight * spriteAspect))
    : 160;

  useEffect(() => {
    if (seekTo != null && ref.current) {
      ref.current.currentTime = seekTo;
      syncTime(seekTo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo]);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!spriteUrl) {
      setSpriteAspect(null);
      return;
    }
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      setSpriteAspect(image.naturalWidth / spriteFrameCount / image.naturalHeight);
    };
    image.src = spriteUrl;
  }, [spriteFrameCount, spriteUrl]);

  function syncTime(nextTime?: number) {
    const time = nextTime ?? ref.current?.currentTime ?? 0;
    setCurrentTime(time);
    onTimeUpdate?.(time);
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
    setHoverPct(pct);
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

  return (
    <div className="space-y-3">
      <div className="group relative overflow-hidden rounded-lg bg-black">
        {mediaUrl ? (
          isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt=""
              className="aspect-video w-full object-contain"
              onLoad={() => onPlay?.()}
            />
          ) : (
            <video
              ref={ref}
              src={mediaUrl}
              loop={loop}
              autoPlay={autoPlay}
              playsInline
              className="aspect-video w-full"
              onClick={togglePlayback}
              onPlay={() => {
                setIsPlaying(true);
                onPlay?.();
                startTicker();
              }}
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
              }}
              onSeeking={(e) => syncTime(e.currentTarget.currentTime)}
              onSeeked={(e) => syncTime(e.currentTarget.currentTime)}
              onEnded={() => {
                setIsPlaying(false);
                stopTicker();
                onEnded?.();
              }}
            />
          )
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-zinc-500">
            Loading playback…
          </div>
        )}
        {mediaUrl && !isImage && (
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlayback}
            className={cn(
              "absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/45 text-white shadow-sm backdrop-blur transition hover:bg-black/70",
              isPlaying && "opacity-0 group-hover:opacity-100",
            )}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          </button>
        )}
        {!isImage && spriteUrl && hoverPct != null && (
          <div
            className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 overflow-hidden rounded border border-zinc-700 bg-zinc-900 shadow-xl"
            style={{ width: spritePreviewWidth, height: spritePreviewHeight }}
          >
            <div
              className="h-full w-full bg-cover bg-no-repeat"
              style={{
                backgroundImage: `url(${spriteUrl})`,
                backgroundSize: `${spriteFrameCount * 100}% 100%`,
                backgroundPosition: `${hoverFramePosition}% center`,
              }}
            />
          </div>
        )}
      </div>
      {!isImage && (
        <div className="space-y-3 px-5 pb-4 pt-1">
        <div
          ref={timelineRef}
          role="slider"
          aria-label="Video timeline"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, duration)}
          aria-valuenow={currentTime}
          tabIndex={0}
          className={cn(
            "group/timeline relative h-6 cursor-ew-resize touch-none rounded-full py-2.5",
            isScrubbing && "cursor-grabbing",
          )}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverPct(
              Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
            );
          }}
          onMouseLeave={() => {
            if (!isScrubbing) setHoverPct(null);
          }}
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
          {hoverPct != null && (
            <div
              className="pointer-events-none absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.85)]"
              style={{ left: `${hoverPct * 100}%` }}
            />
          )}
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-200 bg-teal-300 opacity-0 shadow-[0_0_14px_rgba(45,212,191,0.75)] transition group-hover/timeline:opacity-100"
            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-[auto_auto] items-center gap-3 text-xs text-zinc-500 sm:flex sm:flex-wrap sm:gap-4">
          <button
            type="button"
            onClick={togglePlayback}
            className="inline-flex h-9 w-28 items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/70 px-4 font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <p className="order-3 col-span-2 w-full font-mono text-[12px] tabular-nums text-zinc-400 sm:order-none sm:w-[27ch]">
            {displayMode === "timecode"
              ? `${formatEditorialTimecode(currentTime, frameRate)} / ${formatEditorialTimecode(duration, frameRate)}`
              : `${currentFrame.toLocaleString()} / ${totalFrames.toLocaleString()} fr`}
          </p>
          <div className="flex rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
            <button
              type="button"
              aria-pressed={displayMode === "timecode"}
              onClick={() => setDisplayMode("timecode")}
              className={cn(
                "h-6 rounded px-2 font-mono text-[10px] uppercase transition",
                displayMode === "timecode"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              TC
            </button>
            <button
              type="button"
              aria-pressed={displayMode === "frames"}
              onClick={() => setDisplayMode("frames")}
              className={cn(
                "h-6 rounded px-2 font-mono text-[10px] uppercase transition",
                displayMode === "frames"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              FR
            </button>
          </div>
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
