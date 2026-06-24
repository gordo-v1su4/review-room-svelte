"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { AdminGate, useAdminAccess } from "@/components/auth/AdminGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ProjectVisibility = "private" | "shared" | "workspace";

const visibilityOptions: Array<{
  id: ProjectVisibility;
  label: string;
  description: string;
}> = [
  {
    id: "private",
    label: "Private",
    description: "Only you can see it until you share access.",
  },
  {
    id: "shared",
    label: "Shared",
    description: "Visible to allowed people or domains.",
  },
  {
    id: "workspace",
    label: "Workspace",
    description: "Visible to anyone who can sign in.",
  },
];

function parseAccessRules(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function NewProjectPage() {
  const create = useMutation(api.projects.create);
  const router = useRouter();
  const { isAdmin, isChecking } = useAdminAccess();
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const id = await create({
        title: fd.get("title") as string,
        clientName: (fd.get("clientName") as string) || undefined,
        description: (fd.get("description") as string) || undefined,
        downloadEnabledByDefault: fd.get("download") === "on",
        visibility,
        accessRules: parseAccessRules(fd.get("accessRules")),
      });
      router.push(`/dashboard/projects/${id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminGate>
      {!isChecking && !isAdmin ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="font-medium text-zinc-100">Admin access required</p>
          <p className="mt-1 text-sm text-zinc-500">
            Project creation is limited to the production team.
          </p>
        </div>
      ) : (
      <div className="pl-0 sm:pl-6 lg:pl-8">
        <h1 className="text-2xl font-semibold">New project</h1>
        <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4">
          <Input name="title" placeholder="Project title" required />
          <Input name="clientName" placeholder="Client name" />
          <Textarea name="description" placeholder="Instructions for reviewers" />
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Workspace visibility
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {visibilityOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={visibility === option.id}
                  onClick={() => setVisibility(option.id)}
                  className={cn(
                    "rounded-md border p-3 text-left transition",
                    visibility === option.id
                      ? "border-teal-400/60 bg-teal-400/10 text-zinc-100"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                  )}
                >
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="mt-1 block text-xs leading-4 text-zinc-500">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
            <Textarea
              name="accessRules"
              placeholder="Allowed emails or domains, e.g. person@example.com, *@company.com"
              className={cn(visibility === "workspace" && "opacity-60")}
              disabled={visibility === "workspace"}
            />
            <p className="text-xs text-zinc-600">
              Adding emails or domains makes the project shared. Workspace mode ignores this list.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" name="download" className="accent-teal-400" />
            Allow downloads by default
          </label>
          <Button type="submit" disabled={loading}>
            Create project
          </Button>
        </form>
      </div>
      )}
    </AdminGate>
  );
}
