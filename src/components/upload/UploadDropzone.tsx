"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type FileState = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
};

export function UploadDropzone({ projectId }: { projectId: Id<"projects"> }) {
  const createVideo = useMutation(api.videos.createFromUpload);
  const [files, setFiles] = useState<FileState[]>([]);

  const uploadFiles = useCallback(
    async (list: File[]) => {
      const states: FileState[] = list.map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }));
      setFiles((prev) => [...prev, ...states]);

      for (const item of states) {
        try {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === item.file ? { ...f, status: "uploading", progress: 10 } : f,
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

          await fetch(uploadUrl, {
            method: "PUT",
            body: item.file,
            headers: { "Content-Type": item.file.type || "application/octet-stream" },
          });

          const videoId = await createVideo({
            projectId,
            title: item.file.name.replace(/\.[^.]+$/, ""),
            originalFilename: item.file.name,
            storageKey,
            mimeType: item.file.type || "video/mp4",
            sizeBytes: item.file.size,
          });

          void fetch("/api/media/enqueue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId, storageKey }),
          });

          setFiles((prev) =>
            prev.map((f) =>
              f.file === item.file ? { ...f, status: "done", progress: 100 } : f,
            ),
          );
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
          setFiles((prev) =>
            prev.map((f) =>
              f.file === item.file ? { ...f, status: "error", progress: 0 } : f,
            ),
          );
        }
      }
    },
    [createVideo, projectId],
  );

  return (
    <div className="space-y-3">
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-10 transition-colors hover:border-zinc-500",
        )}
      >
        <Upload className="mb-2 h-8 w-8 text-zinc-500" />
        <span className="text-sm text-zinc-300">Drop videos or click to upload</span>
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
        <ul className="space-y-1 text-xs text-zinc-500">
          {files.map((f) => (
            <li key={f.file.name + f.file.size}>
              {f.file.name} — {f.status} {f.progress > 0 && `${f.progress}%`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
