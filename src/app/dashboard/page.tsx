"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminGate } from "@/components/auth/AdminGate";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const projects = useQuery(api.projects.listForAdmin);

  return (
    <AdminGate>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <Link href="/dashboard/projects/new">
          <Button>New project</Button>
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p._id}
              href={`/dashboard/projects/${p._id}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-600"
            >
              <h2 className="font-medium text-zinc-100 group-hover:text-white">
                {p.title}
              </h2>
              {p.clientName && (
                <p className="mt-1 text-sm text-zinc-500">{p.clientName}</p>
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
            </Link>
          ))}
        </div>
      )}
    </AdminGate>
  );
}
