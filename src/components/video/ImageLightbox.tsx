"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Bookmark, Download, RotateCcw, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { Button } from "@/components/ui/button";
import { VideoRatingControl } from "./VideoRatingControl";
import { cn } from "@/lib/utils";
import {
  ANNOTATION_COLORS,
  ImageAnnotationCanvas,
  annotationSignature,
  type AnnotationStroke,
} from "./ImageAnnotationLayer";

export function ImageLightbox({
  video,
  mode,
  token,
  canDownload = false,
  onClose,
}: {
  video: VideoDoc | null;
  mode: "admin" | "client";
  token?: string;
  canDownload?: boolean;
  onClose: () => void;
}) {
  const imageUrl = useStorageUrl(video?.storageKey, video?.updatedAt);
  const [loadedImage, setLoadedImage] = useState<{ url: string; aspect: number } | null>(null);
  const imageAspect = loadedImage?.url === imageUrl
    ? loadedImage.aspect
    : video?.width && video?.height ? video.width / video.height : 1;
  const open = Boolean(video);
  const markViewedAdmin = useMutation(api.videos.markViewed);
  const markViewedClient = useMutation(api.reviewPublic.clientMarkViewed);
  const setRatingAdmin = useMutation(api.videos.setRating);
  const setRatingClient = useMutation(api.reviewPublic.clientSetRating);
  const toggleSelectAdmin = useMutation(api.videos.toggleSelect);
  const toggleSelectClient = useMutation(api.reviewPublic.clientToggleSelect);
  const saveAnnotationsAdmin = useMutation(api.videos.saveAnnotations);
  const saveAnnotationsClient = useMutation(api.reviewPublic.clientSaveAnnotations);
  const [draftStrokes, setDraftStrokes] = useState<AnnotationStroke[]>([]);
  const [annotationColor, setAnnotationColor] = useState(ANNOTATION_COLORS[0]);
  const [annotationWidth, setAnnotationWidth] = useState(4);
  const [savingAnnotations, setSavingAnnotations] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const savedAnnotationSignature = useMemo(
    () => annotationSignature(video?.annotationStrokes as AnnotationStroke[] | undefined),
    [video?.annotationStrokes],
  );
  const draftAnnotationSignature = useMemo(
    () => annotationSignature(draftStrokes),
    [draftStrokes],
  );
  const annotationsDirty = savedAnnotationSignature !== draftAnnotationSignature;

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

  useEffect(() => {
    setDraftStrokes((video?.annotationStrokes as AnnotationStroke[] | undefined) ?? []);
  }, [video?._id, video?.annotationStrokes]);

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

  async function saveAnnotations() {
    if (!video) return;
    setSavingAnnotations(true);
    try {
      if (mode === "client" && token) {
        await saveAnnotationsClient({
          token,
          videoId: video._id,
          strokes: draftStrokes,
        });
      } else {
        await saveAnnotationsAdmin({ videoId: video._id, strokes: draftStrokes });
      }
      toast.success(draftStrokes.length ? "Markup saved" : "Markup cleared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save markup");
    } finally {
      setSavingAnnotations(false);
    }
  }

  async function downloadImage() {
    if (!video || !canDownload) return;
    setDownloading(true);
    try {
      const response = await fetch("/api/storage/presign-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey: video.storageKey,
          filename: video.originalFilename,
        }),
      });
      if (!response.ok) throw new Error("Could not prepare download");
      const data = (await response.json()) as { downloadUrl?: string };
      if (!data.downloadUrl) throw new Error("Download URL missing");

      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = video.originalFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download image");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-md" />
        <Dialog.Content className="fixed inset-0 z-[90] grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-zinc-950/35 text-zinc-50 outline-none">
          <div className="min-w-0 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur sm:px-6 lg:pr-[36rem]">
            <div className="min-w-0 pr-12 lg:pr-0">
              <Dialog.Title className="truncate text-sm font-medium text-zinc-100">
                {video?.title ?? "Image preview"}
              </Dialog.Title>
              {video?.originalFilename && (
                <Dialog.Description className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {video.originalFilename}
                </Dialog.Description>
              )}
            </div>
            <div className="mt-3 flex max-w-full flex-wrap items-center gap-2 rounded-lg bg-black/10 lg:fixed lg:right-14 lg:top-3 lg:z-[110] lg:mt-0 lg:max-w-[calc(100vw-4rem)] lg:flex-nowrap lg:justify-end">
              {video && (
                <>
                  <div
                    className="inline-flex items-center"
                    style={{
                      height: 28,
                      gap: 6,
                      border: "1px solid rgb(255 255 255 / 0.1)",
                      borderRadius: 4,
                      background: "rgb(255 255 255 / 0.05)",
                      padding: "0 6px",
                    }}
                  >
                    {ANNOTATION_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={`Draw ${color}`}
                        aria-label={`Draw ${color}`}
                        className="shrink-0 rounded-full transition"
                        style={{
                          width: 14,
                          height: 14,
                          backgroundColor: color,
                          border:
                            annotationColor === color
                              ? "1px solid rgb(255 255 255 / 0.95)"
                              : "1px solid rgb(255 255 255 / 0.25)",
                          boxShadow:
                            annotationColor === color
                              ? "0 0 0 2px rgb(255 255 255 / 0.16), 0 0 0 4px rgb(0 0 0 / 0.35)"
                              : "none",
                          filter:
                            annotationColor === color
                              ? "none"
                              : "saturate(0.55) brightness(0.75)",
                          opacity: annotationColor === color ? 1 : 0.35,
                          transform:
                            annotationColor === color ? "scale(1.08)" : "scale(1)",
                        }}
                        onClick={() => setAnnotationColor(color)}
                      />
                    ))}
                  </div>
                  <div
                    className="inline-flex items-center"
                    style={{
                      height: 28,
                      border: "1px solid rgb(255 255 255 / 0.1)",
                      borderRadius: 4,
                      background: "rgb(255 255 255 / 0.05)",
                      padding: "0 8px",
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="range"
                      aria-label="Brush size"
                      min={1}
                      max={9}
                      value={annotationWidth}
                      className="annotation-size-slider w-14"
                      onChange={(event) => setAnnotationWidth(Number(event.target.value))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Undo markup"
                    className="h-7 w-7 border border-white/10 bg-white/5 hover:bg-white/10"
                    disabled={!draftStrokes.length}
                    onClick={() => setDraftStrokes((strokes) => strokes.slice(0, -1))}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="sr-only">Undo markup</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Clear markup"
                    className="h-7 w-7 border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-red-200"
                    disabled={!draftStrokes.length}
                    onClick={() => setDraftStrokes([])}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Clear markup</span>
                  </Button>
                  <button
                    type="button"
                    title="Save markup"
                    className="inline-flex h-7 min-h-7 items-center justify-center gap-1.5 rounded-md border border-teal-400/30 bg-teal-500 px-2.5 py-0 text-[11px] font-medium leading-none text-zinc-950 transition-colors hover:bg-teal-400 disabled:pointer-events-none disabled:opacity-50"
                    disabled={!annotationsDirty || savingAnnotations}
                    onClick={() => void saveAnnotations()}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </button>
                  <VideoRatingControl value={video.rating} onChange={setRating} />
                  <button
                    type="button"
                    className="inline-flex h-7 min-h-7 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-0 text-[11px] font-medium leading-none text-zinc-200 transition-colors hover:bg-white/10"
                    onClick={toggleShortlist}
                  >
                    <Bookmark
                      className={cn(
                        "h-3.5 w-3.5",
                        video.isSelect && "fill-sky-400 text-sky-400",
                      )}
                    />
                    Shortlist
                  </button>
                  {canDownload && (
                    <button
                      type="button"
                      title={`Download ${video.originalFilename}`}
                      className="inline-flex h-7 min-h-7 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-0 text-[11px] font-medium leading-none text-zinc-200 transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
                      disabled={downloading}
                      onClick={() => void downloadImage()}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloading ? "Preparing..." : "Download"}
                    </button>
                  )}
                </>
              )}
            </div>
              <Dialog.Close className="absolute right-3 top-3 z-[110] grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white">
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Close image preview</span>
              </Dialog.Close>
          </div>
          <div className="grid h-full min-h-0 place-items-center overflow-hidden px-3 py-4 [container-type:size] sm:px-8 sm:py-6">
            {imageUrl ? (
              <div
                className="relative inline-block max-w-full shadow-2xl shadow-black/60"
                style={{ width: `min(100cqw, calc(100cqh * ${imageAspect}))`, maxHeight: "100%" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={video?.title ?? ""}
                  className="block h-auto max-h-full w-full object-contain"
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    if (image.naturalHeight) setLoadedImage({ url: imageUrl, aspect: image.naturalWidth / image.naturalHeight });
                  }}
                  draggable={false}
                />
                <ImageAnnotationCanvas
                  strokes={draftStrokes}
                  color={annotationColor}
                  width={annotationWidth}
                  onChange={setDraftStrokes}
                />
              </div>
            ) : (
              <div className="text-sm text-zinc-500">Loading image...</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
