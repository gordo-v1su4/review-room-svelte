"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type FileState = {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
};

function makeUploadId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

function uploadToPresignedUrl({
  file,
  uploadUrl,
  onProgress,
}: {
  file: File;
  uploadUrl: string;
  onProgress: (progress: number) => void;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.max(10, Math.round((event.loaded / event.total) * 90)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(95);
        resolve();
      } else {
        reject(new Error(`Upload failed with HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

function uploadViaServer({
  file,
  projectId,
  onProgress,
}: {
  file: File;
  projectId: Id<"projects">;
  onProgress: (progress: number) => void;
}) {
  return new Promise<{ storageKey: string }>((resolve, reject) => {
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/storage/upload");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.max(10, Math.round((event.loaded / event.total) * 90)));
    };
    xhr.onload = () => {
      let payload: { storageKey?: string; error?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText) as typeof payload;
      } catch {
        payload = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.storageKey) {
        onProgress(95);
        resolve({ storageKey: payload.storageKey });
      } else {
        reject(new Error(payload.error || `Upload failed with HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

export function UploadDropzone({ projectId }: { projectId: Id<"projects"> }) {
  const createVideo = useMutation(api.videos.createFromUpload);
  const [files, setFiles] = useState<FileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFiles = useCallback(
    async (list: File[]) => {
      const videoFiles = list.filter((file) => file.type.startsWith("video/"));
      if (!videoFiles.length) {
        toast.error("Choose video files to upload.");
        return;
      }

      const states: FileState[] = videoFiles.map((file) => ({
        id: makeUploadId(file),
        file,
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
          const presign = await fetch("/api/storage/presign-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              filename: item.file.name,
              contentType: item.file.type || "application/octet-stream",
            }),
          });
          const { uploadUrl, storageKey } = (await presign.json()) as {
            uploadUrl?: string;
            storageKey?: string;
            error?: string;
          };
          if (!uploadUrl || !storageKey) throw new Error(presign.statusText);

          let uploadedStorageKey = storageKey;
          try {
            await uploadToPresignedUrl({
              file: item.file,
              uploadUrl,
              onProgress: (progress) => {
                setFiles((prev) =>
                  prev.map((f) => (f.id === item.id ? { ...f, progress } : f)),
                );
              },
            });
          } catch {
            const fallback = await uploadViaServer({
              file: item.file,
              projectId,
              onProgress: (progress) => {
                setFiles((prev) =>
                  prev.map((f) => (f.id === item.id ? { ...f, progress } : f)),
                );
              },
            });
            uploadedStorageKey = fallback.storageKey;
          }

          const videoId = await createVideo({
            projectId,
            title: item.file.name.replace(/\.[^.]+$/, ""),
            originalFilename: item.file.name,
            storageKey: uploadedStorageKey,
            mimeType: item.file.type || "video/mp4",
            sizeBytes: item.file.size,
          });

          void fetch("/api/media/enqueue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId, storageKey: uploadedStorageKey }),
          });

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
    [createVideo, projectId],
  );

  return (
    <div className="space-y-3">
      <label
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
        <span className="text-sm text-zinc-300">Drop videos or click to upload</span>
        <span className="mt-1 text-xs text-zinc-500">Batch uploads start immediately</span>
        <input
          type="file"
          accept="video/*"
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
