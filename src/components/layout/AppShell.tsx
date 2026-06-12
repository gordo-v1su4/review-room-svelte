"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import {
  Clapperboard,
  ChevronsLeft,
  ChevronsRight,
  Folder,
  Inbox,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAdminAccess } from "@/components/auth/AdminGate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "review-room.sidebar.collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const { isAdmin } = useAdminAccess();
  const { signOut } = useAuthActions();
  const isReview = pathname?.startsWith("/review");
  const isSignIn = pathname?.startsWith("/sign-in");
  const isWorkspace = /^\/dashboard\/projects\/[^/]+$/.test(pathname ?? "");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const projects = useQuery(
    api.projects.listForAdmin,
    isAuthenticated && isAdmin && !isReview ? {} : "skip",
  );

  useEffect(() => {
    setSidebarCollapsed(
      window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true",
    );
    setSidebarReady(true);
  }, []);

  useEffect(() => {
    if (!sidebarReady) return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed, sidebarReady]);

  if (isReview || isSignIn) {
    return <div className="min-h-dvh bg-[var(--background)]">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh bg-[var(--background)] text-zinc-50">
      {isAuthenticated && isAdmin && (
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-r border-zinc-800/70 bg-zinc-950 transition-[width] duration-200 lg:flex",
            sidebarCollapsed ? "w-14" : "w-60",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex h-14 items-center border-b border-zinc-800/70",
              sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-4",
            )}
            title="Review Room"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500 text-zinc-950">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className={cn("leading-tight", sidebarCollapsed && "hidden")}>
              <span className="block text-sm font-semibold">Review Room</span>
              <span className="block text-[10px] text-zinc-600">
                Review workspace
              </span>
            </span>
          </Link>

          <nav className={cn("space-y-1 py-4", sidebarCollapsed ? "px-2" : "px-3")}>
            <SideLink
              href="/dashboard"
              active={pathname === "/dashboard"}
              icon={<Folder className="h-4 w-4" />}
              label="Projects"
              count={projects?.length}
              collapsed={sidebarCollapsed}
            />
            <SideLink
              href="/dashboard"
              icon={<Inbox className="h-4 w-4" />}
              label="Inbox"
              collapsed={sidebarCollapsed}
            />
            <SideLink
              href="/dashboard"
              icon={<Users className="h-4 w-4" />}
              label="Clients"
              collapsed={sidebarCollapsed}
            />
            <SideLink
              href="/dashboard"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              collapsed={sidebarCollapsed}
            />
          </nav>

          <div className={cn("px-3", sidebarCollapsed && "hidden")}>
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
                  <span
                    className={cn(
                      "h-4 w-4 shrink-0 rounded",
                      projectAccentClass(project.title),
                    )}
                  />
                  <span className="truncate">{project.title}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className={cn("mt-auto space-y-3 p-3", sidebarCollapsed && "px-2")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-full text-zinc-500 hover:text-zinc-200"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </Button>
            <Link href="/dashboard/projects/new">
              <Button
                className={cn("w-full gap-2", sidebarCollapsed && "px-0")}
                size="sm"
                variant="secondary"
                title="New project"
              >
                <Plus className="h-4 w-4" />
                <span className={cn(sidebarCollapsed && "hidden")}>New project</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full gap-2 text-zinc-500",
                sidebarCollapsed ? "justify-center px-0" : "justify-start",
              )}
              title="Sign out"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              <span className={cn(sidebarCollapsed && "hidden")}>Sign out</span>
            </Button>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur lg:hidden">
          <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 sm:px-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
              <Clapperboard className="h-4 w-4 text-teal-400" />
              Review Room
            </Link>
            {isAuthenticated && isAdmin && (
              <div className="flex min-w-0 items-center gap-1.5">
                <Button size="sm" className="h-8 gap-1.5 px-2.5" asChild>
                  <Link href="/dashboard/projects/new">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">New</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-zinc-500"
                  onClick={() => void signOut()}
                >
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </header>
        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto",
            isWorkspace ? "" : "mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

const projectAccentClasses = [
  "bg-cyan-400/85",
  "bg-teal-400/85",
  "bg-sky-400/85",
  "bg-emerald-400/85",
  "bg-blue-400/85",
  "bg-zinc-400/85",
];

function projectAccentClass(title: string) {
  const hash = title.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return projectAccentClasses[hash % projectAccentClasses.length] ?? "bg-teal-400/85";
}

function SideLink({
  href,
  active,
  icon,
  label,
  count,
  collapsed,
}: {
  href: string;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "flex items-center rounded-md py-1.5 text-[12.5px] transition",
        collapsed ? "justify-center px-0" : "gap-2.5 px-2",
        active
          ? "bg-zinc-800/60 text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
      )}
    >
      <span className={cn(active ? "text-zinc-200" : "text-zinc-600")}>
        {icon}
      </span>
      <span className={cn("flex-1", collapsed && "hidden")}>{label}</span>
      {count !== undefined && !collapsed && (
        <span className="text-[10px] tabular-nums text-zinc-600">{count}</span>
      )}
    </Link>
  );
}
