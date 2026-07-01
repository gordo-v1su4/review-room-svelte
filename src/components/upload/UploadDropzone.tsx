"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ASSET_CLASS_LABELS,
  isImageFileType,
  isVideoFileType,
  normalizedMediaMimeType,
} from "@/lib/media";
import type { AssetClass } from "@/lib/types";
import { cn } from "@/lib/utils";

type FileState = {
  id: string;
  file: File;
  assetClass: AssetClass;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
};

type ClientPreviewResult = {
  thumbnail: File;
  sprite?: File;
  durationSec?: number;
  width?: number;
  height?: number;
};

const UPLOAD_ASSET_CLASSES: AssetClass[] = ["VID", "IMG", "CTX", "STB"];

function assetClassForUpload(file: File, selectedAssetClass: AssetClass) {
  if (isVideoFileType(file.type, file.name)) return "VID";
  return selectedAssetClass === "VID" ? "IMG" : selectedAssetClass;
}

function makeUploadId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function waitForEvent(target: EventTarget, eventName: string, timeoutMs = 10000) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video preview decode failed"));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener("error", onError);
    };
    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

async function seekVideo(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.02) return;
  const seeked = waitForEvent(video, "seeked");
  video.currentTime = time;
  await seeked;
}

function getPreviewDimensions(
  sourceWidth: number | undefined,
  sourceHeight: number | undefined,
  maxLongEdge: number,
) {
  const width = sourceWidth && sourceWidth > 0 ? sourceWidth : 16;
  const height = sourceHeight && sourceHeight > 0 ? sourceHeight : 9;
  const longEdge = Math.max(width, height);
  const scale = maxLongEdge / longEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  dx = 0,
) {
  ctx.fillStyle = "#000";
  ctx.fillRect(dx, 0, width, height);
  ctx.drawImage(video, dx, 0, width, height);
}

function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  filename: string,
  quality = 0.82,
) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode preview image"));
          return;
        }
        resolve(new File([blob], filename, { type: "image/jpeg" }));
      },
      "image/jpeg",
      quality,
    );
  });
}

async function generateClientPreviews(file: File): Promise<ClientPreviewResult> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "metadata";
  video.playsInline = true;
  video.src = objectUrl;

  try {
    await waitForEvent(video, "loadedmetadata");
    const durationSec =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : undefined;
    const width = video.videoWidth || undefined;
    const height = video.videoHeight || undefined;

    const thumbSize = getPreviewDimensions(width, height, 640);
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = thumbSize.width;
    thumbCanvas.height = thumbSize.height;
    const thumbCtx = thumbCanvas.getContext("2d");
    if (!thumbCtx) throw new Error("Could not create thumbnail canvas");

    await seekVideo(video, Math.min(1, Math.max(0, (durationSec ?? 2) / 2)));
    drawVideoFrame(thumbCtx, video, thumbCanvas.width, thumbCanvas.height);

    const frameCount = 10;
    const frameSize = getPreviewDimensions(width, height, 320);
    const frameWidth = frameSize.width;
    const frameHeight = frameSize.height;
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = frameWidth * frameCount;
    spriteCanvas.height = frameHeight;
    const spriteCtx = spriteCanvas.getContext("2d");
    if (!spriteCtx) throw new Error("Could not create sprite canvas");

    const safeDuration = durationSec && durationSec > 0 ? durationSec : 1;
    for (let index = 0; index < frameCount; index++) {
      const midpoint = (safeDuration * (index + 0.5)) / frameCount;
      const seekSec = Math.max(0, Math.min(safeDuration - 0.05, midpoint));
      await seekVideo(video, seekSec);
      drawVideoFrame(spriteCtx, video, frameWidth, frameHeight, index * frameWidth);
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const [thumbnail, sprite] = await Promise.all([
      canvasToJpegFile(thumbCanvas, `${baseName}-thumb.jpg`, 0.86),
      canvasToJpegFile(spriteCanvas, `${baseName}-sprite.jpg`, 0.8),
    ]);

    return { thumbnail, sprite, durationSec, width, height };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageElement(file: File) {
  return new Promise<{ image: HTMLImageElement; objectUrl: string }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image preview decode failed"));
    };
    image.src = objectUrl;
  });
}

async function generateClientImagePreview(file: File): Promise<ClientPreviewResult> {
  const { image, objectUrl } = await loadImageElement(file);

  try {
    const width = image.naturalWidth || undefined;
    const height = image.naturalHeight || undefined;
    const thumbSize = getPreviewDimensions(width, height, 960);
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = thumbSize.width;
    thumbCanvas.height = thumbSize.height;
    const thumbCtx = thumbCanvas.getContext("2d");
    if (!thumbCtx) throw new Error("Could not create image thumbnail canvas");

    thumbCtx.fillStyle = "#000";
    thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    thumbCtx.drawImage(image, 0, 0, thumbCanvas.width, thumbCanvas.height);

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const thumbnail = await canvasToJpegFile(thumbCanvas, `${baseName}-thumb.jpg`, 0.88);
    return { thumbnail, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function uploadViaPresignedUrl({
  file,
  projectId,
  filename,
  contentType,
  onProgress,
}: {
  file: File;
  projectId: Id<"projects">;
  filename?: string;
  contentType?: string;
  onProgress: (progress: number) => void;
}) {
  return new Promise<{ storageKey: string }>(async (resolve, reject) => {
    const uploadContentType =
      contentType ?? normalizedMediaMimeType(file.type, filename ?? file.name);
    let storageKey: string | undefined;
    let uploadUrl: string | undefined;

    try {
      const response = await fetch("/api/storage/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          filename: filename ?? file.name,
          contentType: uploadContentType,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        uploadUrl?: string;
        storageKey?: string;
        error?: string;
      };

      if (!response.ok || !payload.uploadUrl || !payload.storageKey) {
        throw new Error(payload.error || "Could not prepare upload");
      }

      uploadUrl = payload.uploadUrl;
      storageKey = payload.storageKey;
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Could not prepare upload"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", uploadContentType);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.max(10, Math.round((event.loaded / event.total) * 90)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && storageKey) {
        onProgress(95);
        resolve({ storageKey });
      } else {
        reject(new Error(`Upload failed with HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Direct upload failed"));
    xhr.send(file);
  });
}

export function UploadDropzone({ projectId }: { projectId: Id<"projects"> }) {
  const reserveUpload = useMutation(api.videos.reserveAssetUpload);
  const createVideo = useMutation(api.videos.createFromUpload);
  const markPreviewReady = useMutation(api.videos.setProcessingComplete);
  const markProcessingFailed = useMutation(api.videos.markProcessingFailed);
  const [files, setFiles] = useState<FileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAssetClass, setSelectedAssetClass] = useState<AssetClass>("VID");

  const uploadFiles = useCallback(
    async (list: File[]) => {
      const mediaFiles = list.filter(
        (file) =>
          isVideoFileType(file.type, file.name) ||
          isImageFileType(file.type, file.name),
      );
      if (!mediaFiles.length) {
        toast.error("Choose video or image files to upload.");
        return;
      }

      const states: FileState[] = mediaFiles.map((file) => ({
        id: makeUploadId(file),
        file,
        assetClass: assetClassForUpload(file, selectedAssetClass),
        progress: 0,
        status: "pending",
      }));
      setFiles((prev) => [...prev, ...states]);

      async function uploadOne(item: FileState) {
        try {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, status: "uploading", progress: 10 } : f,
            ),
          );
          const reservation = await reserveUpload({
            projectId,
            originalFilename: item.file.name,
            mimeType: normalizedMediaMimeType(item.file.type, item.file.name),
            assetClass: item.assetClass,
            uploadDateKey: localDateKey(),
          });
          const upload = await uploadViaPresignedUrl({
            file: item.file,
            projectId,
            filename: reservation.uploadFilename,
            contentType: normalizedMediaMimeType(item.file.type, item.file.name),
            onProgress: (progress) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === item.id ? { ...f, progress } : f)),
              );
            },
          });
          const uploadedStorageKey = upload.storageKey;
          const isImage = item.assetClass !== "VID";

          const videoId = await createVideo({
            projectId,
            originalFilename: item.file.name,
            storageKey: uploadedStorageKey,
            mimeType: normalizedMediaMimeType(item.file.type, item.file.name),
            folderId: reservation.folderId,
            assetClass: reservation.assetClass,
            assetNumber: reservation.assetNumber,
            assetCode: reservation.assetCode,
            sizeBytes: item.file.size,
          });

          try {
            const preview = isImage
              ? await generateClientImagePreview(item.file)
              : await generateClientPreviews(item.file);
            setFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress: 97 } : f)),
            );
            const thumbnailUpload = await uploadViaPresignedUrl({
              file: preview.thumbnail,
              projectId,
              filename: `${reservation.assetCode}-thumb.jpg`,
              onProgress: () => {},
            });
            const spriteUpload = preview.sprite
              ? await uploadViaPresignedUrl({
                  file: preview.sprite,
                  projectId,
                  filename: `${reservation.assetCode}-sprite.jpg`,
                  onProgress: () => {},
                })
              : null;
            await markPreviewReady({
              videoId,
              thumbnailKey: thumbnailUpload.storageKey,
              spriteKey: spriteUpload?.storageKey,
              durationSec: preview.durationSec,
              width: preview.width,
              height: preview.height,
            });
          } catch {
            if (isImage) {
              await markPreviewReady({
                videoId,
                thumbnailKey: uploadedStorageKey,
              });
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === item.id ? { ...f, status: "done", progress: 100 } : f,
                ),
              );
              return;
            }
            const enqueue = await fetch("/api/media/enqueue", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoId, storageKey: uploadedStorageKey }),
            });
            if (!enqueue.ok) {
              const payload = (await enqueue.json().catch(() => ({}))) as {
                error?: string;
              };
              await markProcessingFailed({ videoId });
              throw new Error(
                payload.error ??
                  "Upload saved, but preview processing could not start.",
              );
            }
          }

          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, status: "done", progress: 100 } : f,
            ),
          );
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, status: "error", progress: 0 } : f,
            ),
          );
        }
      }

      let cursor = 0;
      const concurrency = Math.min(3, states.length);
      await Promise.all(
        Array.from({ length: concurrency }, async () => {
          while (cursor < states.length) {
            const item = states[cursor++];
            if (item) await uploadOne(item);
          }
        }),
      );
    },
    [createVideo, markPreviewReady, markProcessingFailed, projectId, reserveUpload, selectedAssetClass],
  );

  return (
    <div className="space-y-3">
      <label
        htmlFor="upload-file-input"
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-zinc-900/40 px-4 py-9 text-center transition-colors hover:border-zinc-500 sm:px-6 sm:py-10",
          isDragging ? "border-zinc-300 bg-zinc-800/60" : "border-zinc-700",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void uploadFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <Upload className="mb-2 h-8 w-8 text-zinc-500" />
        <span className="text-sm text-zinc-300">
          Drop videos or images, or click to upload
        </span>
        <span className="mt-1 text-xs text-zinc-500">
          Uploads use today&apos;s flat date folder and a permanent asset code
        </span>
        <div
          className="mt-4 flex flex-wrap items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/70 p-1"
          onClick={(event) => event.preventDefault()}
        >
          {UPLOAD_ASSET_CLASSES.map((assetClass) => (
            <button
              key={assetClass}
              type="button"
              aria-pressed={selectedAssetClass === assetClass}
              className={cn(
                "h-7 rounded-md px-2.5 text-[11px] font-medium transition",
                selectedAssetClass === assetClass
                  ? "bg-teal-400 text-zinc-950"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
              )}
              onClick={() => setSelectedAssetClass(assetClass)}
            >
              {ASSET_CLASS_LABELS[assetClass]}
            </button>
          ))}
        </div>
        <input
          id="upload-file-input"
          type="file"
          accept="video/*,image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length) void uploadFiles(list);
            e.target.value = "";
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="space-y-2 text-xs text-zinc-500">
          {files.map((f) => (
            <li key={f.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-zinc-300">{f.file.name}</span>
                <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                  {f.assetClass}
                </span>
                <span className="shrink-0 capitalize">{f.status}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    f.status === "error" ? "bg-red-500" : "bg-teal-400",
                  )}
                  style={{ width: `${f.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
