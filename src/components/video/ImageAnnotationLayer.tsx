"use client";

import { type PointerEvent, useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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

/** Inline annotation overlay for center viewer (non-fullscreen) */
export function ImageAnnotationLayer({
  video,
  mode,
  token,
  className,
  onClose,
}: {
  video: {
    _id: Id<"videos">;
    annotationStrokes?: AnnotationStroke[] | null;
  };
  mode: "admin" | "client";
  token?: string;
  className?: string;
  onClose?: () => void;
}) {
  const saveAnnotationsAdmin = useMutation(api.videos.saveAnnotations);
  const saveAnnotationsClient = useMutation(api.reviewPublic.clientSaveAnnotations);
  const [draftStrokes, setDraftStrokes] = useState<AnnotationStroke[]>([]);
  const [annotationColor, setAnnotationColor] = useState(ANNOTATION_COLORS[0]);
  const [annotationWidth] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftStrokes((video.annotationStrokes as AnnotationStroke[] | undefined) ?? []);
  }, [video._id, video.annotationStrokes]);

  const dirty = useMemo(
    () => annotationSignature(video.annotationStrokes) !== annotationSignature(draftStrokes),
    [draftStrokes, video.annotationStrokes],
  );

  async function save() {
    setSaving(true);
    try {
      if (mode === "client" && token) {
        await saveAnnotationsClient({ token, videoId: video._id, strokes: draftStrokes });
      } else {
        await saveAnnotationsAdmin({ videoId: video._id, strokes: draftStrokes });
      }
      toast.success(draftStrokes.length ? "Markup saved" : "Markup cleared");
      onClose?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save markup");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("pointer-events-auto", className)}>
      <ImageAnnotationCanvas
        strokes={draftStrokes}
        color={annotationColor}
        width={annotationWidth}
        onChange={setDraftStrokes}
      />
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/90 p-1.5 backdrop-blur">
        <div className="flex gap-1">
          {ANNOTATION_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "h-5 w-5 rounded-full border",
                annotationColor === color ? "border-zinc-100" : "border-transparent",
              )}
              style={{ backgroundColor: color }}
              onClick={() => setAnnotationColor(color)}
            />
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => setDraftStrokes([])}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 gap-1 px-2"
          disabled={!dirty || saving}
          onClick={() => void save()}
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
        {onClose && (
          <Button size="sm" variant="ghost" className="ml-auto h-7 px-2" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
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
