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
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const typedProjectId = projectId as Id<"projects">;
  const { appUser } = useAdminAccess();
  const project = useQuery(
    api.projects.getById,
    appUser ? { projectId: typedProjectId } : "skip",
  );
  const canUpload = project ? project.memberRole !== "viewer" : false;

  return (
    <AdminGate>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Upload media</h1>
        <Button variant="secondary" className="w-full sm:w-auto" asChild>
          <Link href={`/dashboard/projects/${projectId}`}>
            Back to workspace
          </Link>
        </Button>
      </div>
      {!project ? (
        <p className="text-sm text-zinc-500">Loading project...</p>
      ) : canUpload ? (
        <UploadDropzone projectId={typedProjectId} />
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="font-medium text-zinc-100">View-only access</p>
          <p className="mt-1 text-sm text-zinc-500">
            This project is shared with you for review. Ask the owner for edit
            access to upload media.
          </p>
        </div>
      )}
    </AdminGate>
  );
}
