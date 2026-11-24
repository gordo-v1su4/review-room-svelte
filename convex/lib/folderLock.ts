import type { Doc, Id } from '../_generated/dataModel';

/** Apps that may own a folder tree in Review Room. An owned folder is locked here. */
export const folderOwnerApps = ['creative-studio-pro'] as const;
export type FolderOwnerApp = typeof folderOwnerApps[number];
const ownerLabels: Record<FolderOwnerApp, string> = { 'creative-studio-pro': 'Creative Studio Pro' };

/** Who is changing folder structure: a signed-in person (no credential) or an automation credential. */
export type FolderActor = Readonly<{ credentialId?: Id<'automationCredentials'> }>;
type LockFields = Pick<Doc<'projectFolders'>, 'title' | 'ownerApp' | 'ownerCredentialId'>;
export type FolderChange = 'renamed' | 'moved' | 'deleted' | 'given new subfolders' | 'given a link';

export function isFolderOwnerApp(value: unknown): value is FolderOwnerApp {
  return typeof value === 'string' && (folderOwnerApps as readonly string[]).includes(value);
}

/**
 * A locked folder's page in its owning app: https only, no username or password, at most 500 characters.
 * Returns the link as sent (trimmed) with its host, or null when it must not be stored or shown.
 */
export function folderLink(value: unknown): { href: string; host: string } | null {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (!href || href.length > 500 || /[\s\\\u0000-\u001f\u007f]/.test(href) || !/^https:\/\/[^/?#]/i.test(href)) return null;
  if (href.slice(8).split(/[/?#]/)[0].includes('@')) return null;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname ? { href, host: url.host } : null;
  } catch { return null; }
}

export function requireFolderLink(value: unknown) {
  const link = folderLink(value);
  if (!link) throw new Error('Folder link must be an https URL without a username or password, at most 500 characters');
  return link.href;
}

/** Only the credential that owns a locked folder may set or clear its link. */
export function assertFolderLinkable(folder: LockFields, actor: FolderActor) {
  assertFolderChangeable(folder, actor, 'given a link');
  if (!isLockedFolder(folder)) throw new Error('Folder link requires a locked folder owned by the caller');
}

export function isLockedFolder(folder: Pick<LockFields, 'ownerApp'>) { return folder.ownerApp !== undefined; }

/** Only the credential that created a locked folder may change its structure. */
export function canChangeFolder(folder: LockFields, actor: FolderActor) {
  return !isLockedFolder(folder) || (!!actor.credentialId && folder.ownerCredentialId === actor.credentialId);
}

export function assertFolderChangeable(folder: LockFields, actor: FolderActor, change: FolderChange) {
  if (canChangeFolder(folder, actor)) return;
  throw new Error(`Folder is locked: "${folder.title}" is managed by ${ownerLabels[folder.ownerApp!]} and can't be ${change} in Review Room`);
}

/** A move must not drag someone else's locked folders along with it. */
export function assertSubtreeChangeable(folders: readonly (LockFields & Pick<Doc<'projectFolders'>, '_id' | 'parentFolderId'>)[], rootId: Id<'projectFolders'>, actor: FolderActor) {
  const pending = [rootId];
  const seen = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const child of folders.filter(folder => folder.parentFolderId === id)) {
      assertFolderChangeable(child, actor, 'moved');
      pending.push(child._id);
    }
  }
}
