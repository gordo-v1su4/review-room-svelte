"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { AdminGate, useAdminAccess } from "@/components/auth/AdminGate";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { isAdmin } = useAdminAccess();
  const archiveProject = useMutation(api.projects.archive);
  const projects = useQuery(
    api.projects.listForAdmin,
    isAdmin ? {} : "skip",
  );

  return (
    <AdminGate>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <Link href="/dashboard/projects/new">
          <Button className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>
      {!projects ? (
        <p className="mt-8 text-zinc-500">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-zinc-400">No projects yet.</p>
          <Link href="/dashboard/projects/new">
            <Button className="mt-4">Create your first project</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <article
              key={p._id}
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-600"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/dashboard/projects/${p._id}`}
                  className="min-w-0 flex-1"
                >
                  <h2 className="truncate font-medium text-zinc-100 group-hover:text-white">
                    {p.title}
                  </h2>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Archive project"
                  disabled={!p.isOwner}
                  onClick={() => {
                    if (!window.confirm(`Archive "${p.title}"?`)) return;
                    void archiveProject({ projectId: p._id }).then(() => {
                      toast.success("Project archived");
                    });
                  }}
                >
                  <Archive className="h-4 w-4 text-zinc-500" />
                </Button>
              </div>
              {p.clientName && (
                <p className="mt-1 text-sm text-zinc-500">{p.clientName}</p>
              )}
              {!p.isOwner && (
                <p className="mt-2 inline-flex rounded-full border border-teal-400/20 bg-teal-400/10 px-2 py-0.5 text-[11px] font-medium text-teal-300">
                  Shared with you
                </p>
              )}
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-zinc-500">
                <div>
                  <dt>Videos</dt>
                  <dd className="text-zinc-300">{p.videoCount}</dd>
                </div>
                <div>
                  <dt>Awaiting</dt>
                  <dd className="text-zinc-300">{p.awaitingReview}</dd>
                </div>
                <div>
                  <dt>Feedback</dt>
                  <dd className="text-zinc-300">{p.feedbackCount}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </AdminGate>
  );
}
