import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-[10px] border border-white/[0.07] bg-white/[0.035] px-3 py-1 text-sm text-zinc-50 transition-colors placeholder:text-zinc-500 hover:border-white/[0.12] focus-visible:border-[var(--brand-accent)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]/35",
        className,
      )}
      {...props}
    />
  );
}
