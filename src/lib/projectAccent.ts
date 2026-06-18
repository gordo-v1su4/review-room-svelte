import type { CSSProperties } from "react";

export const DEFAULT_PROJECT_ACCENT = "#14b8a6";

export function projectAccent(value?: string): string {
  const color = value ?? DEFAULT_PROJECT_ACCENT;
  return isHexColor(color) ? color : DEFAULT_PROJECT_ACCENT;
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(20,184,166,${alpha})`;
  }
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red},${green},${blue},${alpha})`;
}

export function projectAccentStyle(accent: string) {
  return {
    "--project-accent": accent,
    "--project-accent-soft": hexToRgba(accent, 0.18),
    "--project-accent-muted": hexToRgba(accent, 0.1),
    "--project-accent-ring": hexToRgba(accent, 0.42),
  } as CSSProperties;
}

function isHexColor(value: string) {
  return Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));
}
