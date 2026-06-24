"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
  const { appUser, isAuthenticated, isChecking, isLoading } = useAdminAccess();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isChecking || !isAuthenticated || !appUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
