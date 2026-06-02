"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { isSelfHostedConvexUrl, publicEnv } from "@/lib/env/public";

const url = publicEnv("CONVEX_URL");
const convex = new ConvexReactClient(url, {
  skipConvexDeploymentUrlCheck:
    isSelfHostedConvexUrl(url) || url.includes("unfold.serving.cloud"),
});

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
