"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import {
  Clapperboard,
  Folder,
  Inbox,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const isReview = pathname?.startsWith("/review");
  const isWorkspace = /^\/dashboard\/projects\/[^/]+$/.test(pathname ?? "");
  const projects = useQuery(
    api.projects.listForAdmin,
    isAuthenticated && !isReview ? {} : "skip",
  );

  if (isReview) {
    return <div className="min-h-dvh bg-[var(--background)]">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh bg-[var(--background)] text-zinc-50">
      {isAuthenticated && (
        <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800/70 bg-zinc-950 lg:flex">
          <Link
            href="/dashboard"
            className="flex h-14 items-center gap-2.5 border-b border-zinc-800/70 px-4"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">Review Room</span>
              <span className="block text-[10px] text-zinc-600">
                Review workspace
              </span>
            </span>
          </Link>

          <nav className="space-y-1 px-3 py-4">
            <SideLink
              href="/dashboard"
              active={pathname === "/dashboard"}
              icon={<Folder className="h-4 w-4" />}
              label="Projects"
              count={projects?.length}
            />
            <SideLink
              href="/dashboard"
              icon={<Inbox className="h-4 w-4" />}
              label="Inbox"
            />
            <SideLink
              href="/dashboard"
              icon={<Users className="h-4 w-4" />}
              label="Clients"
            />
            <SideLink
              href="/dashboard"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
            />
          </nav>

          <div className="px-3">
            <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Recent
            </p>
            <div className="space-y-1">
              {(projects ?? []).slice(0, 5).map((project) => (
                <Link
                  key={project._id}
                  href={`/dashboard/projects/${project._id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] transition",
                    pathname === `/dashboard/projects/${project._id}`
                      ? "bg-zinc-800/60 text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
                  )}
                >
                  <span className="h-4 w-4 shrink-0 rounded bg-violet-500/80" />
                  <span className="truncate">{project.title}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-3 p-3">
            <Link href="/dashboard/projects/new">
              <Button className="w-full gap-2" size="sm" variant="secondary">
                <Plus className="h-4 w-4" />
                New project
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-zinc-500"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
              <Clapperboard className="h-4 w-4 text-violet-400" />
              Review Room
            </Link>
            {isAuthenticated && (
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            )}
          </div>
        </header>
        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto",
            isWorkspace ? "" : "mx-auto w-full max-w-[1600px] px-6 py-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function SideLink({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] transition",
        active
          ? "bg-zinc-800/60 text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
      )}
    >
      <span className={cn(active ? "text-zinc-200" : "text-zinc-600")}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-[10px] tabular-nums text-zinc-600">{count}</span>
      )}
    </Link>
  );
}
