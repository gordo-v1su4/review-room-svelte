import { createAnnotationState, transitionAnnotations, validateAnnotations, type AnnotationAction, type AnnotationState } from './annotations';
import type { VideoStatus } from './types';

export type ReviewDraft = Readonly<{ body: string; timecodeSec: number | null }>;
/** Local participant IDs model independent toggles; live Convex summaries expose counts only. */
export type ReactionEmoji = 'thumbs_up' | 'thumbs_down' | 'fire' | 'heart';
export type ReviewComment = Readonly<{ id: string; body: string; timecodeSec: number | null; authorName?: string; authorRole?: 'admin' | 'client'; createdAt?: number; completedAt?: number; completedBy?: string; reactions?: Readonly<Partial<Record<ReactionEmoji, readonly string[]>>> }>;
export type AssetReview = Readonly<{
  id: string;
  status: VideoStatus;
  rating: number;
  shortlisted: boolean;
  viewed: boolean;
  annotations: AnnotationState;
  draft: ReviewDraft;
  comments: readonly ReviewComment[];
  feedbackNeedsAttention: boolean;
}>;
export type ReviewSession = Readonly<{
  activeAssetId: string | null;
  assets: Readonly<Record<string, AssetReview>>;
}>;
export type ReviewAccess = { kind: 'none' } | { kind: 'share' } | { kind: 'project'; memberRole: 'owner' | 'editor' | 'viewer' };
export type ReviewAction =
  | { type: 'annotate'; assetId: string; action: AnnotationAction }
  | { type: 'mark-viewed'; assetId: string }
  | { type: 'toggle-comment-reaction'; assetId: string; commentId: string; actorId: string; emoji: ReactionEmoji }
  | { type: 'toggle-comment-complete'; assetId: string; commentId: string; actorId: string; at: number }
  | { type: 'add-assets'; assets: readonly { id: string }[] }
  | { type: 'status'; assetId: string; status: VideoStatus }
  | { type: 'rate'; assetId: string; rating: number }
  | { type: 'shortlist'; assetId: string; shortlisted: boolean }
  | { type: 'publish-comment'; assetId: string; commentId: string; author?: { name: string; role: 'admin' | 'client' }; createdAt?: number }
  | { type: 'select'; assetId: string | null }
  | { type: 'draft'; assetId: string; body: string; timecodeSec: number | null };

/** Own this state above responsive panels; media URLs and playback remain caller-owned. */
export function createReviewSession(assets: readonly ({ id: string } & Partial<Omit<AssetReview, 'id'>>)[]): ReviewSession {
  return {
    activeAssetId: assets[0]?.id ?? null,
    assets: Object.fromEntries(assets.map(asset => [asset.id, {
      id: asset.id, status: asset.status ?? 'awaiting_review', rating: asset.rating ?? 0,
      shortlisted: asset.shortlisted ?? false, viewed: asset.viewed ?? false,
      annotations: asset.annotations ? { saved: validateAnnotations(asset.annotations.saved), draft: validateAnnotations(asset.annotations.draft) } : createAnnotationState(),
      feedbackNeedsAttention: (asset.comments ?? []).some(comment => !comment.completedAt),
      draft: { ...(asset.draft ?? { body: '', timecodeSec: null }) },
      comments: (asset.comments ?? []).map(comment => ({ ...comment }))
    }]))
  };
}

/**
 * UI/local review transitions only, NOT authorization or persistence.
 * Access must come from the server-validated project membership or review link.
 * Live callers must await the corresponding Convex mutation before applying a
 * review transition (or retain the prior state to roll back).
 * Map shortlisted to videos.isSelect and timecodeSec null to omitted on writes.
 * Status policy follows videos.updateMetadata and reviewPublic.clientSetStatus;
 * destructive archive actions need their separate server/admin checks.
 * Comment completion/reactions match comments.toggleComplete/toggleReaction,
 * which accept project members, but have no public share-token equivalents.
 * For local controls use a stable actorId, e.g. local-reviewer; completedAt
 * determines handled state, reaction actor arrays provide counts and selection.
 * Live adapters must consume authoritative server results rather than fabricate
 * participant identities from aggregate reaction counts.
 */
export function transitionReviewSession(session: ReviewSession, action: ReviewAction, access: ReviewAccess = { kind: 'none' }): ReviewSession {
  if (action.type === 'add-assets') {
    const added = createReviewSession(action.assets.filter(asset => !Object.hasOwn(session.assets, asset.id)));
    return { activeAssetId: session.activeAssetId ?? added.activeAssetId, assets: { ...session.assets, ...added.assets } };
  }
  if (action.type === 'select' && action.assetId === null) return { ...session, activeAssetId: null };
  if (action.assetId === null) return session;
  const asset = Object.hasOwn(session.assets, action.assetId) ? session.assets[action.assetId] : undefined;
  if (!asset) throw new Error('Asset not found');
  if (action.type === 'select') return { ...session, activeAssetId: action.assetId };
  if (action.type !== 'draft' && access.kind === 'none') throw new Error('Review access required');
  let next: AssetReview;
  if (action.type === 'annotate') {
    next = { ...asset, annotations: transitionAnnotations(asset.annotations, action.action) };
  } else if (action.type === 'mark-viewed') {
    next = { ...asset, viewed: true };
  } else if (action.type === 'publish-comment') {
    const body = asset.draft.body.trim();
    if (!body) throw new Error('Comment cannot be empty');
    if (!action.commentId || asset.comments.some(comment => comment.id === action.commentId)) throw new Error('Comment ID must be unique');
    if (action.createdAt !== undefined && (!Number.isFinite(action.createdAt) || action.createdAt < 0)) throw new Error('Comment timestamp must be nonnegative and finite');
    next = { ...asset, feedbackNeedsAttention: true, draft: { body: '', timecodeSec: null }, comments: [...asset.comments, { id: action.commentId, body, timecodeSec: asset.draft.timecodeSec, ...(action.author ? { authorName: action.author.name.trim() || 'Reviewer', authorRole: action.author.role } : {}), ...(action.createdAt !== undefined ? { createdAt: action.createdAt } : {}) }] };
  } else if (action.type === 'toggle-comment-complete') {
    if (access.kind !== 'project') throw new Error('Project membership required');
    if (!action.actorId.trim()) throw new Error('Actor required');
    if (!Number.isFinite(action.at) || action.at <= 0) throw new Error('Completion timestamp must be positive and finite');
    if (!asset.comments.some(comment => comment.id === action.commentId)) throw new Error('Comment not found');
    const comments = asset.comments.map(comment => comment.id !== action.commentId ? comment : {
      ...comment, completedAt: comment.completedAt ? undefined : action.at,
      completedBy: comment.completedAt ? undefined : action.actorId
    });
    next = { ...asset, comments, feedbackNeedsAttention: comments.some(comment => !comment.completedAt) };
  } else if (action.type === 'toggle-comment-reaction') {
    if (access.kind !== 'project') throw new Error('Project membership required');
    if (!action.actorId.trim()) throw new Error('Actor required');
    if (!asset.comments.some(comment => comment.id === action.commentId)) throw new Error('Comment not found');
    const comments = asset.comments.map(comment => {
      if (comment.id !== action.commentId) return comment;
      const actors = comment.reactions?.[action.emoji] ?? [];
      const nextActors = actors.includes(action.actorId) ? actors.filter(id => id !== action.actorId) : [...actors, action.actorId];
      return { ...comment, reactions: { ...comment.reactions, [action.emoji]: nextActors } };
    });
    next = { ...asset, comments };
  } else if (action.type === 'status') {
    const allowed = access.kind === 'project' ? access.memberRole !== 'viewer' : access.kind === 'share' && ['awaiting_review', 'in_progress', 'needs_changes', 'approved'].includes(action.status);
    if (!allowed) throw new Error('Status change not allowed');
    next = { ...asset, status: action.status };
  } else if (action.type === 'rate') {
    if (!Number.isFinite(action.rating)) throw new Error('Rating must be finite');
    next = { ...asset, rating: Math.max(0, Math.min(5, Math.round(action.rating))) };
  } else if (action.type === 'shortlist') {
    next = { ...asset, shortlisted: action.shortlisted };
  } else {
    if (action.timecodeSec !== null && (!Number.isFinite(action.timecodeSec) || action.timecodeSec < 0)) throw new Error('Timecode must be nonnegative and finite');
    next = { ...asset, draft: { body: action.body, timecodeSec: action.timecodeSec } };
  }
  return { ...session, assets: { ...session.assets, [asset.id]: next } };
}
