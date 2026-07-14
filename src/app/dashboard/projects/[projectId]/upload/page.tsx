"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { AdminGate, useAdminAccess } from "@/components/auth/AdminGate";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { Button } from "@/components/ui/button";

export default function UploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const { projectId } = use(params);
  const { folder } = use(searchParams);
  const typedProjectId = projectId as Id<"projects">;
  const requestedFolderId =
    folder && folder !== "root" ? (folder as Id<"projectFolders">) : null;
  const { appUser } = useAdminAccess();
  const project = useQuery(
    api.projects.getById,
    appUser ? { projectId: typedProjectId } : "skip",
  );
  const folders = useQuery(
    api.folders.listByProject,
    appUser ? { projectId: typedProjectId } : "skip",
  );
  const initialFolderId =
    requestedFolderId && folders?.some((item) => item._id === requestedFolderId)
      ? requestedFolderId
      : null;
  const returnHref = initialFolderId
    ? `/dashboard/projects/${projectId}?folder=${initialFolderId}`
    : `/dashboard/projects/${projectId}`;
  const canUpload = Boolean(appUser && project);

  return (
    <AdminGate>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Upload media</h1>
        <Button variant="secondary" className="w-full sm:w-auto" asChild>
          <Link href={returnHref}>Back to workspace</Link>
        </Button>
      </div>
      {!project || !folders ? (
        <p className="text-sm text-zinc-500">Loading project...</p>
      ) : canUpload ? (
        <UploadDropzone
          projectId={typedProjectId}
          folders={folders}
          initialFolderId={initialFolderId}
        />
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="font-medium text-zinc-100">Project unavailable</p>
          <p className="mt-1 text-sm text-zinc-500">
            You need access to this project before you can upload media.
          </p>
        </div>
      )}
    </AdminGate>
  );
}
