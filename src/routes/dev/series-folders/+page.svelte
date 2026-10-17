<script lang="ts">
  import { browser } from '$app/environment';
  import Workspace from '../../+page.svelte';
  import type { Doc, Id } from '../../../../convex/_generated/dataModel';
  import type { PageData } from '../../$types';

  // Dev-only seed: a Creative Studio Pro series tree (locked) beside ordinary and Trailer Feed-connected folders.
  const projectId = 'blood-rush' as Id<'projects'>;
  const ownerId = 'owner' as Id<'appUsers'>;
  const credentialId = 'csp-credential' as Id<'automationCredentials'>;
  type Folder = Doc<'projectFolders'>;
  const folder = (id: string, title: string, order: number, parent?: string, locked = false): Folder => ({
    _id: id as Id<'projectFolders'>, _creationTime: 1, projectId, title, order, createdBy: ownerId, createdAt: 1, updatedAt: 1,
    ...(parent ? { parentFolderId: parent as Id<'projectFolders'> } : {}),
    ...(locked ? { ownerApp: 'creative-studio-pro' as const, ownerCredentialId: credentialId } : {}),
  });
  const seed: Folder[] = [
    folder('ep101', 'EP101 — The Late Shift', 1, undefined, true),
    folder('ep101-010', '010 PAR — Parking Lot', 1, 'ep101', true),
    folder('ep101-010-plates', 'Plates', 1, 'ep101-010', true),
    folder('ep101-020', '020 INT — Diner', 2, 'ep101', true),
    folder('ep101-deliverables', '_Deliverables', 3, 'ep101', true),
    folder('series-deliverables', '_Deliverables', 2, undefined, true),
    folder('selects', 'Selects', 3),
    folder('pickups', 'Pickups', 1, 'selects'),
    folder('trailer-cuts', 'Trailer cuts', 4),
    folder('loose-refs', 'Loose references', 5),
  ];
  const key = 'review-room.dev.series-folders';
  function load(): Folder[] { try { return JSON.parse(sessionStorage.getItem(key) ?? '') as Folder[]; } catch { return seed; } }
  const folders = browser ? load() : seed;

  if (browser) {
    // Stand-in for the owner `moveFolder` action so a tree drag survives the workspace's reload.
    const realFetch = window.fetch.bind(window);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/studio?/moveFolder') && init?.body instanceof FormData) {
        const moving = String(init.body.get('folderId'));
        const parent = String(init.body.get('parentFolderId') ?? '');
        const next = folders.map(item => item._id !== moving ? item : { ...item, parentFolderId: (parent || undefined) as Id<'projectFolders'> | undefined, order: 99 });
        sessionStorage.setItem(key, JSON.stringify(next));
        return new Response('{}', { status: 200 });
      }
      return realFetch(input, init);
    }) as typeof window.fetch;
  }

  const snapshot: NonNullable<PageData['snapshot']> = {
    projects: [{ _id: projectId, _creationTime: 1, title: 'Blood Rush', slug: 'blood-rush', clientName: 'Series · Creative Studio Pro',
      downloadEnabledByDefault: false, createdBy: ownerId, createdAt: 1, updatedAt: 1 }],
    folders, connectedFolderIds: ['trailer-cuts' as Id<'projectFolders'>],
    assets: [], versions: [], mediaJobs: [], comments: [], publications: [], showcases: [], links: [], importedMetadata: [], projectIds: [projectId],
  };
</script>

<Workspace data={{ snapshot }}/>
