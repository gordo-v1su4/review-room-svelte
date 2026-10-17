import { canRestructureFolder, folderAncestors, type ProjectFolder } from './project-folders';

type TreeFolder = Pick<ProjectFolder, 'id' | 'title' | 'parentFolderId' | 'locked'> & Partial<Pick<ProjectFolder, 'projectId' | 'order'>>;
export type FolderTreeRow<F extends TreeFolder> = Readonly<{ folder: F; depth: number; hasChildren: boolean; expanded: boolean }>;

/**
 * Flattens a project's folders into visible sidebar rows, depth-first in sibling order.
 * Collapsed folders hide their descendants; orphaned or cyclic legacy folders stay reachable at the root.
 */
export function folderTreeRows<F extends TreeFolder>(folders: readonly F[], collapsed: ReadonlySet<string>): FolderTreeRow<F>[] {
  const ids = new Set(folders.map(folder => folder.id));
  const children = new Map<string | undefined, F[]>();
  for (const folder of folders) {
    const parent = folder.parentFolderId && ids.has(folder.parentFolderId) ? folder.parentFolderId : undefined;
    children.set(parent, [...(children.get(parent) ?? []), folder]);
  }
  const rows: FolderTreeRow<F>[] = [];
  const seen = new Set<string>();
  function visit(folder: F, depth: number, visible: boolean) {
    if (seen.has(folder.id)) return;
    seen.add(folder.id);
    const descendants = children.get(folder.id) ?? [];
    const expanded = !collapsed.has(folder.id);
    if (visible) rows.push({ folder, depth, hasChildren: descendants.length > 0, expanded });
    for (const child of descendants) visit(child, depth + 1, visible && expanded);
  }
  for (const root of children.get(undefined) ?? []) visit(root, 0, true);
  for (const folder of folders) if (!seen.has(folder.id)) visit(folder, 0, true);
  return rows;
}

/** Whether dragging `folderId` onto `targetParentId` (null = project root) is a valid nest/move. */
export function canDropFolder(folders: readonly ProjectFolder[], folderId: string, targetParentId: string | null): boolean {
  const folder = folders.find(item => item.id === folderId);
  if (!folder || !canRestructureFolder(folders, folderId)) return false;
  if ((folder.parentFolderId ?? null) === targetParentId) return false;
  if (targetParentId === null) return true;
  const target = folders.find(item => item.id === targetParentId);
  if (!target || target.projectId !== folder.projectId || target.locked) return false;
  return !folderAncestors(folders, targetParentId).some(item => item.id === folderId);
}

/** Collapsed IDs with every ancestor of `folderId` opened, so the selected folder is visible. */
export function revealFolder(collapsed: ReadonlySet<string>, folders: readonly ProjectFolder[], folderId: string | null): Set<string> {
  const next = new Set(collapsed);
  if (!folderId) return next;
  for (const ancestor of folderAncestors(folders, folderId).slice(0, -1)) next.delete(ancestor.id);
  return next;
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;
const storageKey = (projectId: string) => `review-room.folder-tree.v1.${projectId}`;

/** Collapsed node IDs remembered for one project. Storage may be missing or blocked. */
export function loadCollapsed(store: KeyValueStore | undefined, projectId: string): string[] {
  try {
    const value: unknown = JSON.parse(store?.getItem(storageKey(projectId)) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 128) : [];
  } catch { return []; }
}

export function saveCollapsed(store: KeyValueStore | undefined, projectId: string, ids: Iterable<string>) {
  try { store?.setItem(storageKey(projectId), JSON.stringify([...new Set(ids)])); } catch { /* per-viewer convenience only */ }
}
