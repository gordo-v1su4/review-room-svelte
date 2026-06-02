"use client";

import { useEffect, useRef, useState } from "react";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { cn, formatTimecode } from "@/lib/utils";

export function VideoPlayer({
  storageKey,
  spriteKey,
  onTimeUpdate,
  seekTo,
}: {
  storageKey: string;
  spriteKey?: string;
  onTimeUpdate?: (sec: number) => void;
  seekTo?: number | null;
}) {
  const videoUrl = useStorageUrl(storageKey);
  const spriteUrl = useStorageUrl(spriteKey);
  const ref = useRef<HTMLVideoElement>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (seekTo != null && ref.current) {
      ref.current.currentTime = seekTo;
    }
  }, [seekTo]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg bg-black">
        {videoUrl ? (
          <video
            ref={ref}
            src={videoUrl}
            controls
            className="aspect-video w-full"
            onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-zinc-500">
            Loading playback…
          </div>
        )}
        {spriteUrl && hoverPct != null && (
          <div
            className="pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 overflow-hidden rounded border border-zinc-700 bg-zinc-900"
            style={{ width: 160, height: 90 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spriteUrl}
              alt=""
              className="h-full w-[1600px] max-w-none object-cover"
              style={{ objectPosition: `${hoverPct * 100}% 50%` }}
            />
          </div>
        )}
      </div>
      <div
        className="relative h-2 cursor-pointer rounded-full bg-zinc-800"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverPct((e.clientX - rect.left) / rect.width);
        }}
        onMouseLeave={() => setHoverPct(null)}
        onClick={(e) => {
          if (!ref.current || !duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          ref.current.currentTime = pct * duration;
        }}
      >
        <div
          className="h-full rounded-full bg-zinc-500"
          style={{
            width: `${((ref.current?.currentTime ?? 0) / (duration || 1)) * 100}%`,
          }}
        />
      </div>
      <p className="text-xs text-zinc-500">
        {formatTimecode(ref.current?.currentTime ?? 0)}
        {duration > 0 && ` / ${formatTimecode(duration)}`}
      </p>
    </div>
  );
}
