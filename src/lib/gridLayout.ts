import type { CSSProperties } from "react";
import type { GridSize } from "@/lib/types";

const TRACK_MIN: Record<GridSize, string> = {
  sm: "11rem",
  md: "14rem",
  lg: "18rem",
};

/**
 * Frame.io-style tracks: auto-fill + 1fr.
 * Full rows share the pane evenly. Leftover cards stay track-sized
 * because empty columns keep their share (auto-fill, not auto-fit).
 */
export function assetGridStyle(size: GridSize): CSSProperties {
  return {
    gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${TRACK_MIN[size]}), 1fr))`,
  };
}

export function assetGridClass(): string {
  return "review-grid grid w-full min-w-0 gap-4";
}
