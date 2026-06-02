"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const isReview = pathname?.startsWith("/review");

  if (isReview) {
    return <div className="min-h-dvh bg-[var(--background)]">{children}</div>;
  }

  return (
    <div className="min-h-dvh bg-[var(--background)] text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wide">
            Review Room
          </Link>
          <nav className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                <Link
                  href="/dashboard"
                  className={cn(
                    "text-sm text-zinc-400 hover:text-zinc-100",
                    pathname === "/dashboard" && "text-zinc-100",
                  )}
                >
                  Projects
                </Link>
                <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-8">{children}</main>
    </div>
  );
}
