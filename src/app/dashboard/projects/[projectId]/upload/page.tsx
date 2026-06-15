"use client";

import { use } from "react";
import Link from "next/link";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { AdminGate } from "@/components/auth/AdminGate";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { Button } from "@/components/ui/button";

export default function UploadPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
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
      <UploadDropzone projectId={projectId as Id<"projects">} />
    </AdminGate>
  );
}
