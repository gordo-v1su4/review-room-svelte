"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { Bookmark, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { Button } from "@/components/ui/button";
import { VideoRatingControl } from "./VideoRatingControl";
import { cn } from "@/lib/utils";

export function ImageLightbox({
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
  const imageUrl = useStorageUrl(video?.storageKey, video?.updatedAt);
  const open = Boolean(video);
  const markViewedAdmin = useMutation(api.videos.markViewed);
  const markViewedClient = useMutation(api.reviewPublic.clientMarkViewed);
  const setRatingAdmin = useMutation(api.videos.setRating);
  const setRatingClient = useMutation(api.reviewPublic.clientSetRating);
  const toggleSelectAdmin = useMutation(api.videos.toggleSelect);
  const toggleSelectClient = useMutation(api.reviewPublic.clientToggleSelect);

  useEffect(() => {
    if (!video || video.viewed) return;
    if (mode === "client" && token) {
      void markViewedClient({ token, videoId: video._id });
      return;
    }
    if (mode === "admin") {
      void markViewedAdmin({ videoId: video._id });
    }
  }, [markViewedAdmin, markViewedClient, mode, token, video]);

  function setRating(rating: number) {
    if (!video) return;
    if (mode === "client" && token) {
      void setRatingClient({ token, videoId: video._id, rating });
      return;
    }
    void setRatingAdmin({ videoId: video._id, rating });
  }

  function toggleShortlist() {
    if (!video) return;
    if (mode === "client" && token) {
      void toggleSelectClient({ token, videoId: video._id });
      return;
    }
    void toggleSelectAdmin({ videoId: video._id });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-md" />
        <Dialog.Content className="fixed inset-0 z-[90] grid grid-rows-[auto_minmax(0,1fr)] bg-zinc-950/35 text-zinc-50 outline-none">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-sm font-medium text-zinc-100">
                {video?.title ?? "Image preview"}
              </Dialog.Title>
              {video?.originalFilename && (
                <Dialog.Description className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {video.originalFilename}
                </Dialog.Description>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {video && (
                <>
                  <VideoRatingControl value={video.rating} onChange={setRating} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1.5 border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"
                    onClick={toggleShortlist}
                  >
                    <Bookmark
                      className={cn(
                        "h-4 w-4",
                        video.isSelect && "fill-sky-400 text-sky-400",
                      )}
                    />
                    Shortlist
                  </Button>
                </>
              )}
              <Dialog.Close className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
                <span className="sr-only">Close image preview</span>
              </Dialog.Close>
            </div>
          </div>
          <div className="grid min-h-0 place-items-center px-3 py-4 sm:px-8 sm:py-8">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={video?.title ?? ""}
                className="max-h-full max-w-full object-contain shadow-2xl shadow-black/60"
              />
            ) : (
              <div className="text-sm text-zinc-500">Loading image...</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
