"use client";

import { type PointerEvent, useState } from "react";
import { cn } from "@/lib/utils";

export type AnnotationPoint = {
  x: number;
  y: number;
};

export type AnnotationStroke = {
  id: string;
  color: string;
  width: number;
  points: AnnotationPoint[];
};

export const ANNOTATION_COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b"];

export function ImageAnnotationOverlay({
  strokes,
  scaleStroke = false,
  className,
}: {
  strokes?: AnnotationStroke[] | null;
  scaleStroke?: boolean;
  className?: string;
}) {
  if (!strokes?.length) return null;

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <AnnotationPaths strokes={strokes} scaleStroke={scaleStroke} />
    </svg>
  );
}

export function ImageAnnotationCanvas({
  strokes,
  color,
  width,
  onChange,
}: {
  strokes: AnnotationStroke[];
  color: string;
  width: number;
  onChange: (strokes: AnnotationStroke[]) => void;
}) {
  const [activeStroke, setActiveStroke] = useState<AnnotationStroke | null>(null);

  function pointForEvent(event: PointerEvent<SVGSVGElement>): AnnotationPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  }

  function startStroke(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointForEvent(event);
    setActiveStroke({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      color,
      width,
      points: [point],
    });
  }

  function moveStroke(event: PointerEvent<SVGSVGElement>) {
    if (!activeStroke) return;
    event.preventDefault();
    const point = pointForEvent(event);
    const previous = activeStroke.points[activeStroke.points.length - 1];
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.002) {
      return;
    }
    setActiveStroke({
      ...activeStroke,
      points: [...activeStroke.points, point],
    });
  }

  function finishStroke(event: PointerEvent<SVGSVGElement>) {
    if (!activeStroke) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (activeStroke.points.length > 1) {
      onChange([...strokes, activeStroke]);
    }
    setActiveStroke(null);
  }

  return (
    <svg
      className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      onPointerDown={startStroke}
      onPointerMove={moveStroke}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
      aria-label="Draw image annotation"
    >
      <AnnotationPaths strokes={strokes} />
      {activeStroke && <AnnotationPaths strokes={[activeStroke]} />}
    </svg>
  );
}

export function hasImageAnnotations(strokes?: AnnotationStroke[] | null) {
  return Boolean(strokes?.some((stroke) => stroke.points.length > 1));
}

export function annotationSignature(strokes?: AnnotationStroke[] | null) {
  return JSON.stringify(strokes ?? []);
}

function pointsToPath(points: AnnotationPoint[]) {
  const [first, ...rest] = points;
  if (!first) return "";
  return rest.reduce(
    (path, point) => `${path} L ${point.x.toFixed(4)} ${point.y.toFixed(4)}`,
    `M ${first.x.toFixed(4)} ${first.y.toFixed(4)}`,
  );
}

function AnnotationPaths({
  strokes,
  scaleStroke = false,
}: {
  strokes: AnnotationStroke[];
  scaleStroke?: boolean;
}) {
  return (
    <>
      {strokes.map((stroke) => (
        <path
          key={stroke.id}
          d={pointsToPath(stroke.points)}
          fill="none"
          stroke={stroke.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={scaleStroke ? stroke.width / 700 : stroke.width}
          vectorEffect={scaleStroke ? undefined : "non-scaling-stroke"}
        />
      ))}
    </>
  );
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
