import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

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
