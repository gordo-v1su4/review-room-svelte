"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import type { VideoStatus } from "@/lib/types";
import {
  ADMIN_STATUS_EXTRAS,
  CARD_STATUS_OPTIONS,
  STATUS_BADGE_CLASS,
  videoStatusLabel,
} from "@/lib/videoStatus";
import { cn } from "@/lib/utils";

export function VideoStatusControl({
  status,
  canEdit = true,
  includeAdminExtras = false,
  compact = false,
  hideLabel = false,
  onChange,
}: {
  status: VideoStatus;
  canEdit?: boolean;
  includeAdminExtras?: boolean;
  compact?: boolean;
  hideLabel?: boolean;
  onChange?: (status: VideoStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const extras = includeAdminExtras
    ? ADMIN_STATUS_EXTRAS.filter((item) => item !== status)
    : [];
  const currentInReview = CARD_STATUS_OPTIONS.includes(status);
  const menuStatuses = currentInReview
    ? CARD_STATUS_OPTIONS
    : [status, ...CARD_STATUS_OPTIONS];

  function selectStatus(next: VideoStatus) {
    onChange?.(next);
    setOpen(false);
  }

  const badge = (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        STATUS_BADGE_CLASS[status],
      )}
    >
      {videoStatusLabel(status)}
    </span>
  );

  if (!canEdit || !onChange) {
    return (
      <div className={cn("min-w-0", !hideLabel && (compact ? "space-y-0.5" : "space-y-1"))}>
        {!hideLabel && <StatusLabel compact={compact} />}
        {badge}
      </div>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Change status"
          className={cn(
            "block w-full min-w-0 rounded-md text-left outline-none transition",
            "hover:bg-white/[0.03] focus-visible:ring-1 focus-visible:ring-[var(--brand-accent)]/40",
            hideLabel ? "px-0 py-0" : compact ? "space-y-0.5 px-1 py-0.5" : "space-y-1",
          )}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {!hideLabel && <StatusLabel compact={compact} />}
          <span className="flex min-w-0 items-center">{badge}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-48 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl shadow-black/50"
          onClick={(event) => event.stopPropagation()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {menuStatuses.map((option) => (
            <StatusMenuButton
              key={option}
              option={option}
              active={option === status}
              onSelect={selectStatus}
            />
          ))}
          {extras.length > 0 && (
            <>
              <p className="mt-1.5 px-2 pt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                More
              </p>
              {extras.map((option) => (
                <StatusMenuButton
                  key={option}
                  option={option}
                  active={option === status}
                  onSelect={selectStatus}
                />
              ))}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function StatusLabel({ compact }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium text-zinc-500",
        compact ? "text-[9px]" : "text-[10px]",
      )}
    >
      <span className="grid h-3 w-3 place-items-center rounded-[3px] border border-zinc-600 text-zinc-500">
        <ChevronDown className="h-2 w-2" />
      </span>
      Status
    </span>
  );
}

function StatusMenuButton({
  option,
  active,
  onSelect,
}: {
  option: VideoStatus;
  active: boolean;
  onSelect: (status: VideoStatus) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option)}
      className={cn(
        "flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs",
        active
          ? "bg-zinc-800/90 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
      )}
    >
      <span
        className={cn(
          "inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium",
          STATUS_BADGE_CLASS[option],
        )}
      >
        {videoStatusLabel(option)}
      </span>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-zinc-300" />}
    </button>
  );
}
