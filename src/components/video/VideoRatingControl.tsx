"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function VideoRatingControl({
  value,
  onChange,
  disabled,
  className,
  starClassName,
  buttonClassName,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  className?: string;
  starClassName?: string;
  buttonClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n === value ? 0 : n)}
          className={cn(
            "grid min-h-8 min-w-8 place-items-center rounded p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-40 sm:min-h-0 sm:min-w-0",
            buttonClassName,
          )}
          aria-label={`Rate ${n}`}
          aria-pressed={n === value}
        >
          <Star
            className={cn(
              "h-4 w-4",
              starClassName,
              n <= value && "fill-[var(--rating)] text-[var(--rating)]",
            )}
          />
        </button>
      ))}
    </div>
  );
}
