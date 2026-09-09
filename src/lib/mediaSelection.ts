import type { Id } from "../../convex/_generated/dataModel";

export type MediaSelectModifiers = {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
};

export function emptySelectModifiers(): MediaSelectModifiers {
  return { shiftKey: false, metaKey: false, ctrlKey: false };
}

export function modifiersFromEvent(event: {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): MediaSelectModifiers {
  return {
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
  };
}

export function nextCheckedIds(
  orderedIds: Id<"videos">[],
  current: Id<"videos">[],
  clickedId: Id<"videos">,
  lastId: Id<"videos"> | null,
  modifiers: MediaSelectModifiers,
): Id<"videos">[] {
  if (modifiers.shiftKey && lastId && orderedIds.includes(lastId)) {
    const start = orderedIds.indexOf(lastId);
    const end = orderedIds.indexOf(clickedId);
    if (start === -1 || end === -1) return [clickedId];
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    return orderedIds.slice(from, to + 1);
  }

  if (modifiers.metaKey || modifiers.ctrlKey) {
    return current.includes(clickedId)
      ? current.filter((id) => id !== clickedId)
      : [...current, clickedId];
  }

  return [clickedId];
}
