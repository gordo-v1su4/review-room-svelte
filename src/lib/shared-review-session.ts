import { createReviewSession, transitionReviewSession, type AssetReview, type ReviewAction, type ReviewSession } from './review-session';
import { annotationsEqual, type AnnotationStroke } from './annotations';

export type SharedReviewCommand =
  | { type: 'status'; assetId: string; status: 'awaiting_review' | 'in_progress' | 'needs_changes' | 'approved' }
  | { type: 'rate'; assetId: string; rating: number }
  | { type: 'shortlist'; assetId: string; shortlisted: boolean }
  | { type: 'mark-viewed'; assetId: string }
  | { type: 'publish-comment'; assetId: string; commentId: string; body: string; timecodeSec: number | null }
  | { type: 'save-annotations'; assetId: string; strokes: readonly AnnotationStroke[] };
export interface SharedReviewGateway { commit(command: SharedReviewCommand, signal: AbortSignal): Promise<AssetReview> }
export type SharedReviewState = Readonly<{ session: ReviewSession; busyIds: readonly string[]; error: string }>;

/** Local drafts stay immediate; only gateway-confirmed writes become review state. */
export function createSharedReviewSession(initial: readonly AssetReview[], gateway: SharedReviewGateway, onChange: (state: SharedReviewState) => void) {
  let session = createReviewSession(initial);
  const pending = new Map<string, { controller: AbortController; type: SharedReviewCommand['type'] }>();
  const queuedViewed = new Map<string, (confirmed: boolean) => void>();
  let error = '';
  let disposed = false;
  function publish() { if (!disposed) onChange({ session, busyIds: [...pending.keys()], error }); }
  publish();
  async function review(action: ReviewAction, preserveError = false): Promise<boolean> {
      if (disposed) return false;
      if (action.type === 'add-assets' || action.type === 'toggle-comment-complete' || action.type === 'toggle-comment-reaction' || (action.type === 'status' && !['awaiting_review', 'in_progress', 'needs_changes', 'approved'].includes(action.status))) {
        error = 'This action is unavailable in shared reviews.'; publish(); return false;
      }
      let next: ReviewSession;
      try { next = transitionReviewSession(session, action, { kind: 'share' }); }
      catch { error = 'This review change is invalid. Check it and try again.'; publish(); return false; }
      if (action.type === 'select' || action.type === 'draft' || (action.type === 'annotate' && action.action.type !== 'save')) {
        session = next; publish(); return true;
      }
      const inFlight = pending.get(action.assetId);
      if (inFlight) {
        if (action.type !== 'mark-viewed' || inFlight.type === 'mark-viewed' || queuedViewed.has(action.assetId)) return false;
        return new Promise<boolean>(resolve => queuedViewed.set(action.assetId, resolve));
      }
      const before = session.assets[action.assetId];
      const command: SharedReviewCommand = action.type === 'rate'
        ? { type: 'rate', assetId: action.assetId, rating: next.assets[action.assetId].rating }
        : action.type === 'publish-comment' ? { type: 'publish-comment', assetId: action.assetId, commentId: action.commentId, body: before.draft.body.trim(), timecodeSec: before.draft.timecodeSec }
        : action.type === 'annotate' ? { type: 'save-annotations', assetId: action.assetId, strokes: next.assets[action.assetId].annotations.saved }
        : action.type === 'status' ? { type: 'status', assetId: action.assetId, status: action.status as Extract<SharedReviewCommand, { type: 'status' }>['status'] }
        : action.type === 'shortlist' ? { type: 'shortlist', assetId: action.assetId, shortlisted: action.shortlisted }
        : { type: 'mark-viewed', assetId: action.assetId };
      const controller = new AbortController();
      pending.set(action.assetId, { controller, type: command.type });
      if (!preserveError) error = '';
      publish();
      try {
        const result = await gateway.commit(command, controller.signal);
        if (disposed || controller.signal.aborted) return false;
        if (result.id !== action.assetId) throw new Error('Gateway returned a different asset');
        const current = session.assets[action.assetId];
        const submittedUnchanged = action.type === 'publish-comment' && current.draft.body === before.draft.body && current.draft.timecodeSec === before.draft.timecodeSec;
        const markupUnchanged = command.type === 'save-annotations' && annotationsEqual(current.annotations.draft, before.annotations.draft);
        session = { ...session, assets: { ...session.assets, [action.assetId]: { ...result, draft: submittedUnchanged ? { body: '', timecodeSec: null } : current.draft, annotations: { ...result.annotations, draft: markupUnchanged ? result.annotations.saved : current.annotations.draft } } } };
        return true;
      } catch { if (!disposed) error = 'Could not save this review change. Try again.'; return false; }
      finally {
        pending.delete(action.assetId);
        const confirmViewed = queuedViewed.get(action.assetId);
        queuedViewed.delete(action.assetId);
        if (confirmViewed && !disposed && !session.assets[action.assetId].viewed) {
          // Drain once; a failed tracking request must await a new viewing intent.
          void review({ type: 'mark-viewed', assetId: action.assetId }, true).then(confirmViewed);
        } else {
          confirmViewed?.(!disposed && session.assets[action.assetId].viewed);
          publish();
        }
      }
  }
  return {
    review: (action: ReviewAction) => review(action),
    dispose() {
      disposed = true;
      for (const { controller } of pending.values()) controller.abort();
      pending.clear();
      for (const resolve of queuedViewed.values()) resolve(false);
      queuedViewed.clear();
    }
  };
}
