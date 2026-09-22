import type { VideoStatus } from './types';
import type { ReviewAccess } from './review-session';

/** Checked assets are independent of the active viewer and the shortlist facet. */
export type SelectionState = Readonly<{ ids: readonly string[]; anchorId: string | null }>;
export type SelectionAction =
  | { type: 'click'; id: string; visibleIds: readonly string[]; shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }
  | { type: 'select-visible'; visibleIds: readonly string[] }
  | { type: 'select-all'; allIds: readonly string[] }
  | { type: 'clear' }
  | { type: 'reconcile'; allIds: readonly string[] };

export function transitionSelection(state: SelectionState, action: SelectionAction): SelectionState {
  if (action.type === 'clear') return { ids: [], anchorId: null };
  if (action.type === 'select-visible' || action.type === 'select-all') return { ids: [...new Set(action.type === 'select-visible' ? action.visibleIds : action.allIds)], anchorId: null };
  if (action.type === 'reconcile') {
    const available = new Set(action.allIds);
    const ids = [...new Set(state.ids)].filter(id => available.has(id));
    const anchorId = state.anchorId !== null && available.has(state.anchorId) ? state.anchorId : null;
    if (ids.length === state.ids.length && ids.every((id, index) => id === state.ids[index]) && anchorId === state.anchorId) return state;
    return { ids, anchorId };
  }
  const ordered = [...new Set(action.visibleIds)];
  if (!ordered.includes(action.id)) return state;
  const start = state.anchorId === null ? -1 : ordered.indexOf(state.anchorId);
  const end = ordered.indexOf(action.id);
  let ids: readonly string[];
  if (action.shiftKey && start !== -1) ids = ordered.slice(Math.min(start, end), Math.max(start, end) + 1);
  else if (action.metaKey || action.ctrlKey) ids = state.ids.includes(action.id) ? state.ids.filter(id => id !== action.id) : [...state.ids, action.id];
  else ids = [action.id];
  return { ids, anchorId: action.id };
}

/** Local UI gating only. Live mutations must still enforce server permissions.
 * Archive is intentionally absent: production controls require their own policy.
 */
export function selectionPermissions(access: ReviewAccess): { rate: boolean; shortlist: boolean; statuses: readonly VideoStatus[] } {
  return {
    rate: access.kind !== 'none', shortlist: access.kind !== 'none',
    statuses: access.kind === 'project' && access.memberRole !== 'viewer'
      ? ['not_started', 'in_progress', 'awaiting_review', 'needs_changes', 'approved', 'final', 'omitted']
      : access.kind === 'share' ? ['awaiting_review', 'in_progress', 'needs_changes', 'approved'] : [],
  };
}
