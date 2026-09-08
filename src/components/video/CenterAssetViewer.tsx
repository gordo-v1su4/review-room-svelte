"use client";

import { useState } from "react";
import type { VideoDoc } from "@/lib/smartViews";
import { isImageAsset } from "@/lib/media";
import { VideoPlayer } from "./VideoPlayer";
import { CENTER_VIEWER_CLASS } from "./videoPreviewSizing";
import { cn } from "@/lib/utils";
import { ImageAnnotationLayer } from "./ImageAnnotationLayer";

export function CenterAssetViewer({
  video,
  mode,
  token,
  autoPlay = false,
  loop = false,
  onEnded,
  onFirstPlay,
  seekTo,
  onTimeUpdate,
  drawMode = false,
  onDrawModeChange,
  canAnnotate = false,
}: {
  video: VideoDoc;
  mode: "admin" | "client";
  token?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  onFirstPlay?: () => void;
  seekTo?: number | null;
  onTimeUpdate?: (seconds: number) => void;
  drawMode?: boolean;
  onDrawModeChange?: (enabled: boolean) => void;
  canAnnotate?: boolean;
}) {
  const isImage = isImageAsset(video);
  const [playhead, setPlayhead] = useState(0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center p-3",
          CENTER_VIEWER_CLASS,
        )}
        onMouseEnter={onFirstPlay}
      >
        <div className="relative h-full w-full">
          <VideoPlayer
            storageKey={video.storageKey}
            spriteKey={video.spriteKey}
            mimeType={video.mimeType}
            assetClass={video.assetClass}
            version={video.updatedAt}
            fps={video.fps}
            width={video.width}
            height={video.height}
            autoPlay={autoPlay}
            loop={loop}
            fitAvailable
            onPlay={onFirstPlay}
            onTimeUpdate={(sec) => {
              setPlayhead(sec);
              onTimeUpdate?.(sec);
            }}
            onEnded={onEnded}
            seekTo={seekTo}
          />
          {isImage && drawMode && canAnnotate && (
            <ImageAnnotationLayer
              video={video}
              mode={mode}
              token={token}
              className="absolute inset-0"
              onClose={() => onDrawModeChange?.(false)}
            />
          )}
        </div>
      </div>
      {!isImage && drawMode && (
        <p className="border-t border-zinc-800/60 px-3 py-2 text-[11px] text-zinc-500">
          Video annotation uses the current frame at {formatTime(playhead)}.
        </p>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
