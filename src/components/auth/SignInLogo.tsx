"use client";

import { useCallback, useRef } from "react";

const quickHoverGlitch = {
  playMode: "hover" as const,
  timing: { duration: 250, iterations: 1 },
  glitchTimeSpan: { start: 0, end: 1 },
  shake: { velocity: 15, amplitudeX: 0.2, amplitudeY: 0.2 },
  slice: {
    count: 6,
    velocity: 15,
    minHeight: 0.02,
    maxHeight: 0.15,
    hueRotate: false,
    cssFilters: "drop-shadow(2px 0 0 #6eb5a8) drop-shadow(-2px 0 0 #6eb5a8)",
  },
};

const logoMaskStyle = {
  backgroundColor: "#fafafa",
  WebkitMaskImage: "url(/logo-rr-light.png)",
  maskImage: "url(/logo-rr-light.png)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskPosition: "center",
  maskPosition: "center",
} as const;

export function SignInLogo() {
  const startedRef = useRef(false);

  const startGlitch = useCallback((logo: HTMLElement) => {
    if (startedRef.current || logo.dataset.glitched) return;
    startedRef.current = true;

    void import("powerglitch").then(({ PowerGlitch }) => {
      PowerGlitch.glitch(logo, quickHoverGlitch);
    });
  }, []);

  const onLogoRef = useCallback(
    (logo: HTMLDivElement | null) => {
      if (!logo) return;
      startGlitch(logo);
    },
    [startGlitch],
  );

  return (
    <div className="flex justify-center">
      <div
        ref={onLogoRef}
        aria-hidden
        className="h-12 w-[calc(3rem*809/484)] opacity-85 sm:h-[3.4rem] sm:w-[calc(3.4rem*809/484)]"
        style={logoMaskStyle}
      />
    </div>
  );
}
