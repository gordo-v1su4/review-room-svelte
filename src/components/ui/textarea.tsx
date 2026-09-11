import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[10px] border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-sm text-zinc-50 transition-colors placeholder:text-zinc-500 hover:border-white/[0.12] focus-visible:border-[var(--brand-accent)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]/35",
        className,
      )}
      {...props}
    />
  );
}
