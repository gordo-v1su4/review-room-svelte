import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';

export function folderNameKey(value: string) { return value.trim().toLowerCase(); }

export async function validateFolderParent(ctx: MutationCtx, projectId: Id<'projects'>, parentFolderId?: Id<'projectFolders'>, movingFolderId?: Id<'projectFolders'>) {
  const visited = new Set<string>();
  let id = parentFolderId;
  while (id) {
    if (id === movingFolderId || visited.has(id)) throw new Error('Folder cycle is not allowed');
    visited.add(id);
    const folder = await ctx.db.get(id);
    if (!folder || folder.projectId !== projectId) throw new Error('Parent folder belongs to another project or is unavailable');
    id = folder.parentFolderId;
  }
}

export async function requireEmptyChildFolders(ctx: MutationCtx, folderId: Id<'projectFolders'>, projectId: Id<'projects'>) {
  const folders = await ctx.db.query('projectFolders').withIndex('by_project', q => q.eq('projectId', projectId)).collect();
  if (folders.some(folder => folder.parentFolderId === folderId)) throw new Error('Move or remove subfolders first');
}

export async function disposeFolder(ctx: MutationCtx, folder: Doc<'projectFolders'>, disposition: 'move_to_root' | 'archive_assets') {
  await requireEmptyChildFolders(ctx, folder._id, folder.projectId);
  const sessions = await ctx.db.query('uploadSessions').withIndex('by_project', q => q.eq('projectId', folder.projectId)).collect();
  const now = Date.now();
  if (sessions.some(session => session.folderId === folder._id && session.expiresAt > now && (session.status === 'pending' || session.status === 'finalizing'))) throw new Error('Upload in progress in this folder');
  const assets = await ctx.db.query('videos').withIndex('by_project_folder', q => q.eq('projectId', folder.projectId).eq('folderId', folder._id)).collect();
  for (const asset of assets) await ctx.db.patch(asset._id, { folderId: undefined, ...(disposition === 'archive_assets' ? { status: 'archived' as const } : {}), updatedAt: now });
  await ctx.db.delete(folder._id);
  await ctx.db.patch(folder.projectId, { updatedAt: now });
  return { moved: disposition === 'move_to_root' ? assets.length : 0, archived: disposition === 'archive_assets' ? assets.length : 0 };
}
