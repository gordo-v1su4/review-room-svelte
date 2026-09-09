"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function CommentComposer({
  onSubmit,
  currentTime,
  disabled,
  timecodeEnabled = true,
  drawEnabled = false,
  drawActive = false,
  onDrawToggle,
}: {
  onSubmit: (body: string, timecodeSec?: number) => void;
  currentTime?: number;
  disabled?: boolean;
  timecodeEnabled?: boolean;
  drawEnabled?: boolean;
  drawActive?: boolean;
  onDrawToggle?: () => void;
}) {
  const [body, setBody] = useState("");
  const [useTime, setUseTime] = useState(false);

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Leave a note…"
        disabled={disabled}
        className="caret-teal-400 text-teal-200/80 focus-visible:ring-teal-500/35"
      />
      <div className="flex flex-wrap items-center gap-2">
        {timecodeEnabled && (
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={useTime}
              onChange={(e) => setUseTime(e.target.checked)}
              className="rounded border-zinc-700"
            />
            Pin to current time
          </label>
        )}
        {drawEnabled && onDrawToggle && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 gap-1.5 px-2",
              drawActive && "bg-[var(--brand-accent-muted)] text-[var(--brand-accent)]",
            )}
            onClick={onDrawToggle}
          >
            <PenLine className="h-3.5 w-3.5" />
            Draw
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          disabled={!body.trim() || disabled}
          onClick={() => {
            onSubmit(body.trim(), timecodeEnabled && useTime ? currentTime : undefined);
            setBody("");
          }}
        >
          Add comment
        </Button>
      </div>
    </div>
  );
}
