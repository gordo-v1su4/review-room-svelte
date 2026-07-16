"use client";

import { useCallback, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useMutation } from "convex/react";
import { Check, ChevronDown, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
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
  errorMessage?: string;
};

type ClientPreviewResult = {
  thumbnail: File;
  sprite?: File;
  durationSec?: number;
  width?: number;
  height?: number;
};

const UPLOAD_ASSET_CLASSES: AssetClass[] = ["VID", "IMG", "CTX", "STB"];
const DATE_FOLDER_VALUE = "__date__";
const MULTIPART_PART_BYTES = 50 * 1024 * 1024;

function assetClassForUpload(file: File, selectedAssetClass: AssetClass) {
  if (isVideoFileType(file.type, file.name)) return "VID";
  return selectedAssetClass === "VID" ? "IMG" : selectedAssetClass;
}

function makeUploadId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
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

function uploadBlobViaPresignedUrl({
  file,
  uploadUrl,
  contentType,
  onProgress,
}: {
  file: Blob;
  uploadUrl: string;
  contentType?: string;
  onProgress: (progress: number) => void;
}) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.getResponseHeader("ETag") ?? "");
      } else {
        reject(
          new Error(
            xhr.status === 413
              ? "This upload exceeded the storage gateway's per-request size limit."
              : `Upload failed with HTTP ${xhr.status}`,
          ),
        );
      }
    };
    xhr.onerror = () => reject(new Error("Direct upload failed"));
    xhr.send(file);
  });
}

async function postMultipartAction<T>(body: Record<string, unknown>) {
  const response = await fetch("/api/storage/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Multipart upload request failed");
  return payload;
}

async function uploadViaMultipart({
  file,
  projectId,
  filename,
  contentType,
  onProgress,
}: {
  file: File;
  projectId: Id<"projects">;
  filename: string;
  contentType: string;
  onProgress: (progress: number) => void;
}) {
  let storageKey: string | undefined;
  let uploadId: string | undefined;

  try {
    const created = await postMultipartAction<{ storageKey: string; uploadId: string }>({
      action: "create",
      projectId,
      filename,
      contentType,
    });
    storageKey = created.storageKey;
    uploadId = created.uploadId;

    const partCount = Math.ceil(file.size / MULTIPART_PART_BYTES);
    const parts: Array<{ ETag: string; PartNumber: number }> = [];

    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      const start = (partNumber - 1) * MULTIPART_PART_BYTES;
      const end = Math.min(start + MULTIPART_PART_BYTES, file.size);
      const { uploadUrl } = await postMultipartAction<{ uploadUrl: string }>({
        action: "part",
        storageKey,
        uploadId,
        partNumber,
      });
      const etag = await uploadBlobViaPresignedUrl({
        file: file.slice(start, end),
        uploadUrl,
        onProgress: (partProgress) => {
          const uploadedBytes = start + (end - start) * partProgress;
          onProgress(Math.max(10, Math.round((uploadedBytes / file.size) * 85)));
        },
      });
      if (!etag) throw new Error("Storage did not return an ETag for an uploaded part");
      parts.push({ ETag: etag, PartNumber: partNumber });
    }

    await postMultipartAction<{ storageKey: string }>({
      action: "complete",
      storageKey,
      uploadId,
      parts,
    });
    onProgress(95);
    return { storageKey };
  } catch (error) {
    if (storageKey && uploadId) {
      await postMultipartAction({ action: "abort", storageKey, uploadId }).catch(() => {});
    }
    throw error;
  }
}

async function uploadViaPresignedUrl({
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
  const uploadFilename = filename ?? file.name;
  const uploadContentType =
    contentType ?? normalizedMediaMimeType(file.type, uploadFilename);

  if (file.size > MULTIPART_PART_BYTES) {
    return uploadViaMultipart({
      file,
      projectId,
      filename: uploadFilename,
      contentType: uploadContentType,
      onProgress,
    });
  }

  const response = await fetch("/api/storage/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      filename: uploadFilename,
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

  await uploadBlobViaPresignedUrl({
    file,
    uploadUrl: payload.uploadUrl,
    contentType: uploadContentType,
    onProgress: (progress) => onProgress(Math.max(10, Math.round(progress * 85))),
  });
  onProgress(95);
  return { storageKey: payload.storageKey };
}

export function UploadDropzone({
  projectId,
  folders,
  initialFolderId,
}: {
  projectId: Id<"projects">;
  folders: Doc<"projectFolders">[];
  initialFolderId?: Id<"projectFolders"> | null;
}) {
  const reserveUpload = useMutation(api.videos.reserveAssetUpload);
  const createVideo = useMutation(api.videos.createFromUpload);
  const markPreviewReady = useMutation(api.videos.setProcessingComplete);
  const markProcessingFailed = useMutation(api.videos.markProcessingFailed);
  const [files, setFiles] = useState<FileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAssetClass, setSelectedAssetClass] = useState<AssetClass>("VID");
  const [selectedFolderId, setSelectedFolderId] = useState<Id<"projectFolders"> | null>(
    initialFolderId ?? null,
  );
  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    [folders],
  );
  const selectedFolder = selectedFolderId
    ? folders.find((folder) => folder._id === selectedFolderId)
    : null;
  const uploadDateKey = localDateKey();
  const destinationLabel = selectedFolder
    ? selectedFolder.title
    : `Today's date folder (${uploadDateKey})`;
  const destinationOptions = useMemo(
    () => [
      {
        id: DATE_FOLDER_VALUE,
        label: `Today's date folder (${uploadDateKey})`,
      },
      ...sortedFolders.map((folder) => ({
        id: folder._id,
        label: folder.title,
      })),
    ],
    [sortedFolders, uploadDateKey],
  );
  const selectedDestinationValue = selectedFolderId ?? DATE_FOLDER_VALUE;
  const selectDestination = (value: string) => {
    setSelectedFolderId(
      value === DATE_FOLDER_VALUE ? null : (value as Id<"projectFolders">),
    );
  };

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
            ...(selectedFolderId ? { folderId: selectedFolderId } : {}),
            originalFilename: item.file.name,
            mimeType: normalizedMediaMimeType(item.file.type, item.file.name),
            assetClass: item.assetClass,
            uploadDateKey,
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
          const errorMessage = err instanceof Error ? err.message : "Upload failed";
          toast.error(`${item.file.name}: ${errorMessage}`);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, status: "error", progress: 0, errorMessage }
                : f,
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
    [
      createVideo,
      markPreviewReady,
      markProcessingFailed,
      projectId,
      reserveUpload,
      selectedAssetClass,
      selectedFolderId,
      uploadDateKey,
    ],
  );

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
        <div className="flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-zinc-300">Destination</span>
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-left text-xs text-zinc-200 outline-none transition hover:border-zinc-700 hover:bg-zinc-800 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/25 sm:w-72"
                aria-label="Choose upload destination"
              >
                <span className="truncate">{destinationLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={6}
                className="z-50 max-h-72 w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 text-zinc-200 shadow-2xl shadow-black/45"
              >
                {destinationOptions.map((option) => {
                  const isSelected = selectedDestinationValue === option.id;

                  return (
                    <Popover.Close asChild key={option.id}>
                      <button
                        type="button"
                        onClick={() => selectDestination(option.id)}
                        className={cn(
                          "flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs outline-none transition focus-visible:ring-1 focus-visible:ring-teal-300/80",
                          isSelected
                            ? "border border-teal-400/35 bg-teal-400/12 text-teal-100"
                            : "border border-transparent text-zinc-400 hover:bg-teal-400/10 hover:text-teal-100",
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    </Popover.Close>
                  );
                })}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-zinc-600">
          New uploads will be placed in {destinationLabel}. You can change this
          before dropping or choosing files.
        </p>
      </div>
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
          Destination: {destinationLabel}
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
                <span className="min-w-0 flex-1 truncate text-zinc-300">
                  {f.file.name}
                  <span className="ml-2 text-zinc-600">{formatFileSize(f.file.size)}</span>
                </span>
                <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                  {f.assetClass}
                </span>
                <span className="shrink-0 capitalize">{f.status}</span>
              </div>
              {f.errorMessage && (
                <p className="mt-1 text-[11px] text-red-400">{f.errorMessage}</p>
              )}
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
