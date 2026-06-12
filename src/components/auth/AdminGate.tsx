"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";

export function useAdminAccess() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const appUser = useQuery(
    api.auth.loggedInAppUser,
    isAuthenticated ? {} : "skip",
  );
  const isAdmin = appUser?.role === "admin";
  const isChecking = isLoading || (isAuthenticated && appUser === undefined);

  return {
    appUser,
    isAdmin,
    isAuthenticated,
    isChecking,
    isLoading,
  };
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAuthenticated, isChecking, isLoading } = useAdminAccess();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isChecking || !isAuthenticated || isAdmin || redirecting) return;

    setRedirecting(true);
    void signOut().finally(() => {
      router.replace("/sign-in?error=unauthorized");
    });
  }, [isAdmin, isAuthenticated, isChecking, redirecting, router, signOut]);

  if (isChecking || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
