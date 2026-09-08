"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
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
  onClose,
}: {
  video: VideoDoc | null;
  mode: "admin" | "client";
  token?: string;
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
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[90] grid -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 text-zinc-50 shadow-2xl shadow-black/70 outline-none"
          style={previewStyle}
        >
          <div className="flex min-w-0 items-center justify-between gap-4 border-b border-white/10 bg-black/25 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-sm font-medium text-zinc-100">
                {video?.title ?? "Video preview"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 truncate text-[11px] text-zinc-500">
                {video?.originalFilename ?? "Expanded video preview"}
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
              <span className="sr-only">Close video preview</span>
            </Dialog.Close>
          </div>
          <div className="min-h-0 p-3 sm:p-5">
            {video ? (
              <VideoPlayer
                storageKey={video.storageKey}
                spriteKey={video.spriteKey}
                mimeType={video.mimeType}
                assetClass={video.assetClass}
                version={video.updatedAt}
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
