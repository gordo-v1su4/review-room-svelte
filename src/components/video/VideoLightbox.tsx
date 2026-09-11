"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "convex/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { VideoPlayer } from "./VideoPlayer";
import {
  nativeMediaAspect,
  videoLightboxStyle,
} from "./videoPreviewSizing";

export function VideoLightbox({
  video,
  mode,
  token,
  hasPrev = false,
  hasNext = false,
  onPrev,
  onNext,
  onClose,
}: {
  video: VideoDoc | null;
  mode: "admin" | "client";
  token?: string;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
}) {
  const open = Boolean(video);
  const previewStyle = videoLightboxStyle(
    nativeMediaAspect(video?.width, video?.height),
  );
  const markViewedAdmin = useMutation(api.videos.markViewed);
  const markViewedClient = useMutation(api.reviewPublic.clientMarkViewed);

  function handleFirstPlay() {
    if (!video || video.viewed) return;
    if (mode === "client" && token) {
      void markViewedClient({ token, videoId: video._id });
      return;
    }
    if (mode === "admin") {
      void markViewedAdmin({ videoId: video._id });
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="rr-overlay fixed inset-0 z-[80] bg-black/80 backdrop-blur-md" />
        <Dialog.Content
          className="rr-dialog rr-frame fixed left-1/2 top-1/2 z-[90] grid -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0a0c] text-zinc-50 outline-none"
          style={previewStyle}
        >
          <div className="flex min-w-0 items-center justify-between gap-4 border-b border-white/10 bg-black/25 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p
                className="rr-eyebrow mb-1"
                style={{ color: "var(--brand-accent)" }}
              >
                Preview — Quick view
              </p>
              <Dialog.Title className="truncate text-sm font-medium text-zinc-100">
                {video?.title ?? "Video preview"}
              </Dialog.Title>
              <Dialog.Description className="rr-readout mt-0.5 truncate text-[10px] tracking-[0.08em] text-zinc-500">
                {video?.originalFilename ?? "Expanded video preview"}
                {video?.width && video?.height
                  ? ` — ${video.width}×${video.height}`
                  : ""}
              </Dialog.Description>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {onPrev && (
                <button
                  type="button"
                  title="Previous media (←)"
                  aria-label="Previous media"
                  disabled={!hasPrev}
                  onClick={onPrev}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {onNext && (
                <button
                  type="button"
                  title="Next media (→)"
                  aria-label="Next media"
                  disabled={!hasNext}
                  onClick={onNext}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <Dialog.Close className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
                <span className="sr-only">Close video preview</span>
              </Dialog.Close>
            </div>
          </div>
          <div className="min-h-0 p-3 sm:p-5">
            {video ? (
              <VideoPlayer
                key={video._id}
                storageKey={video.storageKey}
                spriteKey={video.spriteKey}
                posterKey={video.thumbnailKey}
                mimeType={video.mimeType}
                assetClass={video.assetClass}
                fps={video.fps}
                width={video.width}
                height={video.height}
                autoPlay
                onPlay={handleFirstPlay}
              />
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
