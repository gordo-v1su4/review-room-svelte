"use client";

import { useState } from "react";
import { Separator } from "react-resizable-panels";
import { cn } from "@/lib/utils";

export function WorkspaceResizeHandle({ className }: { className?: string }) {
  const [dragging, setDragging] = useState(false);

  return (
    <Separator
      className={cn(
        "group relative z-10 flex w-1.5 shrink-0 items-stretch bg-transparent transition-colors",
        dragging && "bg-[var(--brand-accent-muted)]",
        className,
      )}
      onPointerDown={() => setDragging(true)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-zinc-800 transition-all duration-150",
          "group-hover:w-0.5 group-hover:bg-[var(--brand-accent)]/40",
          "group-data-[separator=active]:w-0.5 group-data-[separator=active]:bg-[var(--brand-accent)]",
          dragging && "w-0.5 bg-[var(--brand-accent)]",
        )}
      />
    </Separator>
  );
}
