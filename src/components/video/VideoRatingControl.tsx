"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function VideoRatingControl({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n === value ? 0 : n)}
          className="rounded p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-40"
          aria-label={`Rate ${n}`}
        >
          <Star
            className={cn("h-4 w-4", n <= value && "fill-amber-400 text-amber-400")}
          />
        </button>
      ))}
    </div>
  );
}
