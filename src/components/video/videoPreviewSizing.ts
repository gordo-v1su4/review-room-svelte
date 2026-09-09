export const VIDEO_PREVIEW_VIEWPORT_CLASS =
  "h-[75dvh] w-[75vw] max-h-[calc(100dvh-1.5rem)] max-w-[calc(100vw-1.5rem)]";

export function nativeMediaAspect(
  width?: number | null,
  height?: number | null,
) {
  if (width && height && width > 0 && height > 0) {
    return width / height;
  }
  return 1;
}

export function videoLightboxStyle(aspect: number): {
  width: string;
  maxWidth: string;
  maxHeight: string;
} {
  return {
    width: `min(75vw, calc((75dvh - 8.5rem) * ${aspect}))`,
    maxWidth: "calc(100vw - 1.5rem)",
    maxHeight: "calc(100dvh - 1.5rem)",
  };
}

/** Center column viewer inside the resizable workspace shell */
export const CENTER_VIEWER_CLASS =
  "h-full max-h-[min(72dvh,calc(100dvh-8rem))] w-full max-w-full";

/** Expanded / lightbox preview caps */
export const EXPANDED_PREVIEW_CLASS =
  "max-h-[min(80dvh,calc(100dvh-4rem))] max-w-[min(90vw,1400px)]";
