"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { isSelfHostedConvexUrl, publicEnv } from "@/lib/env/public";

const url = publicEnv("CONVEX_URL", { required: false });
const convex = url
  ? new ConvexReactClient(url, {
      skipConvexDeploymentUrlCheck:
        isSelfHostedConvexUrl(url) || url.includes("unfold.serving.cloud"),
    })
  : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0d0f] p-6 text-center">
          <p className="text-sm font-medium text-zinc-300">Review Room</p>
          <h1 className="mt-3 text-xl font-semibold">Missing Convex URL</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Set <span className="font-mono text-zinc-300">NEXT_PUBLIC_CONVEX_URL</span>{" "}
            for this deployment, then rebuild.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
