/**
 * Shared helpers for cycling through media with the keyboard.
 */

/** True when keyboard focus sits in a field that should keep its keys. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

/**
 * Step through a list of ids. When `currentId` is null, forward steps land on
 * the first item and backward steps on the last. Otherwise the step is
 * relative to the current position and clamped at both ends (no wrap).
 */
export function stepInList<T>(
  ids: T[],
  currentId: T | null,
  direction: 1 | -1,
): T | null {
  if (!ids.length) return null;
  if (currentId == null) {
    return direction === 1 ? ids[0] : ids[ids.length - 1];
  }
  const index = ids.indexOf(currentId);
  if (index === -1) {
    return direction === 1 ? ids[0] : ids[ids.length - 1];
  }
  const next = index + direction;
  if (next < 0 || next >= ids.length) return currentId;
  return ids[next];
}
