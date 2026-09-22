export type AnnotationPoint = Readonly<{ x: number; y: number }>;
export type AnnotationTool = 'pen' | 'arrow' | 'rect' | 'circle';
export type AnnotationStroke = Readonly<{ id: string; color: string; width: number; tool?: AnnotationTool; points: readonly AnnotationPoint[] }>;
export type AnnotationState = Readonly<{ saved: readonly AnnotationStroke[]; draft: readonly AnnotationStroke[] }>;
export type AnnotationAction = { type: 'replace'; strokes: readonly AnnotationStroke[] } | { type: 'undo' | 'clear' | 'save' | 'revert' };

/** Backend-compatible limits (convex/videos.ts normalizeStrokes), but reject
 * malformed rows/overflow instead of silently dropping a user's markup. */
export function validateAnnotations(strokes: unknown): AnnotationStroke[] {
  if (!Array.isArray(strokes) || strokes.length > 120) throw new Error('Annotations must contain at most 120 strokes');
  const ids = new Set<string>();
  const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
  return strokes.map((stroke: unknown) => {
    if (!record(stroke)) throw new Error('Invalid annotation stroke');
    const { id, color, width, tool, points } = stroke;
    if (typeof id !== 'string' || !id.trim() || id.length > 80 || ids.has(id)) throw new Error('Annotation IDs must be unique, nonempty and at most 80 characters');
    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('Annotation color must be six-digit hex');
    if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) throw new Error('Annotation width must be positive and finite');
    if (tool !== undefined && tool !== 'pen' && tool !== 'arrow' && tool !== 'rect' && tool !== 'circle') throw new Error('Invalid annotation tool');
    if (!Array.isArray(points) || points.length < 2 || points.length > 1500) throw new Error('Each annotation requires 2 to 1500 points');
    const ownedPoints = points.map((point: unknown) => {
      if (!record(point) || typeof point.x !== 'number' || typeof point.y !== 'number' || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error('Annotation coordinates must be finite numbers');
      return { x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) };
    });
    ids.add(id);
    return { id, color, width: Math.max(2, Math.min(18, Math.round(width))), ...(tool === undefined ? {} : { tool }), points: ownedPoints };
  });
}
export function annotationsEqual(left: readonly AnnotationStroke[], right: readonly AnnotationStroke[]): boolean {
  return left.length === right.length && left.every((stroke, i) => {
    const other = right[i]!;
    return stroke.id === other.id && stroke.color === other.color && stroke.width === other.width && (stroke.tool ?? 'pen') === (other.tool ?? 'pen') && stroke.points.length === other.points.length && stroke.points.every((point, j) => point.x === other.points[j]!.x && point.y === other.points[j]!.y);
  });
}
export function createAnnotationState(initial: readonly AnnotationStroke[] = []): AnnotationState {
  return { saved: validateAnnotations(initial), draft: validateAnnotations(initial) };
}
export function transitionAnnotations(state: AnnotationState, action: AnnotationAction): AnnotationState {
  const saved = validateAnnotations(action.type === 'save' ? state.draft : state.saved);
  const draft = validateAnnotations(action.type === 'replace' ? action.strokes : action.type === 'undo' ? state.draft.slice(0, -1) : action.type === 'clear' ? [] : action.type === 'revert' ? state.saved : state.draft);
  return { saved, draft };
}
