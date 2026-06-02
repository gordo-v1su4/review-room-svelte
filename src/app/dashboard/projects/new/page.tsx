"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { AdminGate } from "@/components/auth/AdminGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewProjectPage() {
  const create = useMutation(api.projects.create);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
      });
      router.push(`/dashboard/projects/${id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminGate>
      <h1 className="text-2xl font-semibold">New project</h1>
      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4">
        <Input name="title" placeholder="Project title" required />
        <Input name="clientName" placeholder="Client name" />
        <Textarea name="description" placeholder="Instructions for reviewers" />
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" name="download" />
          Allow downloads by default
        </label>
        <Button type="submit" disabled={loading}>
          Create project
        </Button>
      </form>
    </AdminGate>
  );
}
