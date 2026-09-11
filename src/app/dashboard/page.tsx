"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { AdminGate, useAdminAccess } from "@/components/auth/AdminGate";
import { Button } from "@/components/ui/button";

function visibilityBadge(visibility: string | undefined, isOwner: boolean) {
  if (!isOwner) return "Shared with you";
  if (visibility === "workspace") return "Workspace";
  if (visibility === "shared") return "Shared";
  return "Private";
}

export default function DashboardPage() {
  const { appUser, isAdmin } = useAdminAccess();
  const archiveProject = useMutation(api.projects.archive);
  const projects = useQuery(
    api.projects.listForAdmin,
    appUser ? {} : "skip",
  );

  return (
    <AdminGate>
      <div className="rr-leader pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="rr-eyebrow" style={{ color: "var(--brand-accent)" }}>
            Mission control
          </p>
          <p className="rr-readout text-[10px] tracking-[0.14em] text-zinc-600 uppercase">
            RR / 01
          </p>
        </div>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          {isAdmin && (
            <Link href="/dashboard/projects/new">
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                New project
              </Button>
            </Link>
          )}
        </div>
      </div>
      {!projects ? (
        <p className="mt-8 text-zinc-500">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-zinc-400">
            {isAdmin ? "No projects yet." : "No shared projects yet."}
          </p>
          {isAdmin && (
            <Link href="/dashboard/projects/new">
              <Button className="mt-4">Create your first project</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <article
              key={p._id}
              className="rr-frame group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[linear-gradient(180deg,rgb(255_255_255/0.04)_0%,rgb(255_255_255/0.012)_100%)] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-[linear-gradient(180deg,rgb(255_255_255/0.055)_0%,rgb(255_255_255/0.02)_100%)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-accent)]/35 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
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
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-teal-400/20 bg-teal-400/10 px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.14em] text-teal-300 uppercase">
                <span className="h-1 w-1 rounded-full bg-teal-300" />
                {visibilityBadge(p.visibility, p.isOwner)}
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-800/60 pt-3">
                <div>
                  <dt className="rr-eyebrow">Media</dt>
                  <dd className="rr-readout mt-1.5 text-lg font-medium text-zinc-200">
                    {String(p.videoCount).padStart(2, "0")}
                  </dd>
                </div>
                <div>
                  <dt className="rr-eyebrow">Awaiting</dt>
                  <dd
                    className="rr-readout mt-1.5 text-lg font-medium"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    {String(p.awaitingReview).padStart(2, "0")}
                  </dd>
                </div>
                <div>
                  <dt className="rr-eyebrow">Feedback</dt>
                  <dd className="rr-readout mt-1.5 text-lg font-medium text-zinc-200">
                    {String(p.feedbackCount).padStart(2, "0")}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </AdminGate>
  );
}
