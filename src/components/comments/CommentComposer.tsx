"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentComposer({
  onSubmit,
  currentTime,
  disabled,
  timecodeEnabled = true,
}: {
  onSubmit: (body: string, timecodeSec?: number) => void;
  currentTime?: number;
  disabled?: boolean;
  timecodeEnabled?: boolean;
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
