"use client";

import { PanelLeft, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspacePanelToggles({
  viewerOpen,
  infoOpen,
  onToggleViewer,
  onToggleInfo,
}: {
  viewerOpen: boolean;
  infoOpen: boolean;
  onToggleViewer: () => void;
  onToggleInfo: () => void;
}) {
  return (
    <div className="hidden h-8 items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900 p-0.5 lg:inline-flex">
      <ToggleButton
        active={viewerOpen}
        label="Toggle viewer"
        onClick={onToggleViewer}
        icon={<PanelLeft className="h-3.5 w-3.5" />}
      >
        Viewer
      </ToggleButton>
      <ToggleButton
        active={infoOpen}
        label="Toggle info"
        onClick={onToggleInfo}
        icon={<PanelRight className="h-3.5 w-3.5" />}
      >
        Info
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded px-2 text-[11px] font-medium transition",
        active
          ? "bg-[var(--brand-accent-muted)] text-[var(--brand-accent)] ring-1 ring-[var(--brand-accent)]/35"
          : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200",
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
