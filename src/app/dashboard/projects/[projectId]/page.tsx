"use client";

import { use } from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ProjectWorkspace } from "@/components/project/ProjectWorkspace";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <ProjectWorkspace projectId={projectId as Id<"projects">} />;
}
