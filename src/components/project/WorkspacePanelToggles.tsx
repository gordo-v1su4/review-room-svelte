"use client";

import { PanelLeft, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspacePanelToggles({
  viewerActive,
  infoActive,
  onToggleViewer,
  onToggleInfo,
}: {
  viewerActive: boolean;
  infoActive: boolean;
  onToggleViewer: () => void;
  onToggleInfo: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <ToggleButton
        active={viewerActive}
        label="Toggle viewer"
        onClick={onToggleViewer}
        icon={<PanelLeft className="h-3.5 w-3.5" />}
      >
        Viewer
      </ToggleButton>
      <ToggleButton
        active={infoActive}
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
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md px-0 text-[11px] font-medium transition lg:w-auto lg:gap-1.5 lg:px-2.5",
        active
          ? "bg-[var(--brand-accent-muted)] text-[var(--brand-accent)]"
          : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100",
      )}
    >
      {icon}
      <span className="hidden lg:inline">{children}</span>
    </button>
  );
}
