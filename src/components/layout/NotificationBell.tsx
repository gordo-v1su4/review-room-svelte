"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import * as Popover from "@radix-ui/react-popover";
import { Bell, Inbox } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

export function NotificationBell({ collapsed }: { collapsed?: boolean }) {
  const digests = useQuery(api.inbox.listFeedbackDigests, {});
  const unreadCount =
    digests?.reduce((sum, digest) => sum + digest.needsAttentionCount, 0) ?? 0;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Notifications"
          className={cn(
            "relative flex w-full items-center rounded-md py-1.5 text-[12.5px] text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300",
            collapsed ? "justify-center px-0" : "gap-2.5 px-2",
          )}
        >
          <span className="relative inline-flex shrink-0">
            <Bell className="h-4 w-4" />
            {collapsed && unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[var(--brand-accent)] px-0.5 text-[8px] font-semibold leading-none text-zinc-950">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">Notifications</span>
              {unreadCount > 0 && (
                <span className="grid min-w-[1.1rem] shrink-0 place-items-center rounded-full bg-[var(--brand-accent)] px-1 text-[9px] font-semibold text-zinc-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={collapsed ? "start" : "start"}
          side={collapsed ? "right" : "bottom"}
          sideOffset={8}
          className="rr-popover z-50 w-80 max-w-[calc(100vw-1rem)] rounded-xl border border-white/[0.08] bg-[#0d0d0f] p-2"
        >
          <div className="mb-2 flex items-center justify-between border-b border-zinc-800 px-2 pb-2">
            <p className="text-xs font-medium text-zinc-200">Notifications</p>
            <Link
              href="/dashboard/inbox"
              className="text-[10px] text-[var(--brand-accent)] hover:underline"
            >
              View inbox
            </Link>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {!digests ? (
              <p className="px-2 py-4 text-center text-xs text-zinc-500">Loading…</p>
            ) : digests.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-zinc-500">
                No feedback yet
              </p>
            ) : (
              digests.slice(0, 8).map((digest) => (
                <Link
                  key={digest.digestKey}
                  href="/dashboard/inbox"
                  className="block rounded-md border border-zinc-800/80 bg-zinc-900/50 px-2.5 py-2 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-200">
                        {digest.projectTitle}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        {digest.commentCount}{" "}
                        {digest.commentCount === 1 ? "comment" : "comments"}
                      </p>
                    </div>
                    {digest.needsAttentionCount > 0 && (
                      <span className="shrink-0 rounded-full bg-[var(--info-muted)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--info)]">
                        {digest.needsAttentionCount} open
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/dashboard/inbox"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-md border border-zinc-800 px-2 py-1.5 text-[11px] text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
          >
            <Inbox className="h-3.5 w-3.5" />
            Open feedback inbox
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
