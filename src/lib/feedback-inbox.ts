import type { ReviewComment } from './review-session';

export type FeedbackNote = Readonly<{
  commentId: string; assetId: string; projectId: string; folderId?: string;
  title: string; authorName: string; authorRole: 'admin' | 'client'; body: string;
  createdAt?: number; timecodeSec: number | null; completedAt?: number;
}>;
export type FeedbackDigest = { id: string; projectId: string; projectName: string; dateKey: string; latestAt: number; comments: FeedbackNote[]; needsAttentionCount: number };
type Project = Readonly<{ id: string; name: string; archived?: boolean }>;
type Asset = Readonly<{ id: string; projectId: string; folderId?: string | null; name: string; archived?: boolean; status?: string; comments: readonly ReviewComment[] }>;

/** Local projection of the server inbox contract, not an authorization substitute. */
export function feedbackDigests(projects: readonly Project[], assets: readonly Asset[], access: { isAdmin: boolean; projectIds: readonly string[] }): FeedbackDigest[] {
  if (!access.isAdmin) return [];
  const permitted = new Set(access.projectIds);
  const groups = new Map<string, FeedbackDigest>();
  for (const asset of assets) {
    const project = projects.find(project => project.id === asset.projectId);
    if (!project || project.archived || !permitted.has(project.id) || asset.archived || asset.status === 'archived') continue;
    for (const comment of asset.comments) {
      const createdAt = comment.createdAt;
      const dateKey = createdAt === undefined ? 'undated' : new Date(createdAt).toISOString().slice(0, 10);
      const id = `${project.id}:${dateKey}`;
      const group = groups.get(id) ?? { id, projectId: project.id, projectName: project.name, dateKey, latestAt: 0, comments: [], needsAttentionCount: 0 };
      group.comments.push({ commentId: comment.id, assetId: asset.id, projectId: project.id, ...(asset.folderId ? { folderId: asset.folderId } : {}), title: asset.name, authorName: comment.authorName ?? 'You', authorRole: comment.authorRole ?? 'admin', body: comment.body, createdAt, timecodeSec: comment.timecodeSec, completedAt: comment.completedAt });
      group.latestAt = Math.max(group.latestAt, createdAt ?? 0);
      group.needsAttentionCount += comment.completedAt ? 0 : 1;
      groups.set(id, group);
    }
  }
  return [...groups.values()].map(group => ({ ...group, comments: group.comments.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)) })).sort((a, b) => b.latestAt - a.latestAt);
}
