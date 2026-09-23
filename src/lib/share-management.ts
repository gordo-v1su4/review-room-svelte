import type { AppearanceValue } from './appearance';

/** Safe share summary: never return the passcode or its hash to the list UI. */
export type ReviewLink = Readonly<{ id: string; path: string; canDownload: boolean; protected: boolean; createdAt: number; expiresAt?: number }>;
export type ShareRequest = Readonly<{
  passcode?: string;
  canDownload: boolean;
  appearance: { gridSize: 'sm' | 'md' | 'lg'; aspectRatio: 'video' | 'square' | 'portrait'; thumbnailScale: 'fit' | 'fill'; showCardInfo: boolean };
}>;
export type ShareDraft = Readonly<{ passcode: string; canDownload: boolean; appearance: AppearanceValue }>;
export type ShareList = { kind: 'ready'; links: readonly ReviewLink[] } | { kind: 'denied' | 'unavailable' };
export interface ShareGateway {
  list(projectId: string, signal: AbortSignal): Promise<ShareList>;
  create(projectId: string, request: ShareRequest, signal: AbortSignal): Promise<ReviewLink>;
}
export type ShareManagementState = Readonly<{ kind: 'loading' | 'ready' | 'denied' | 'unavailable'; links: readonly ReviewLink[]; creating: boolean; error?: string }>;

export const offlineShareGateway: ShareGateway = {
  list: async () => ({ kind: 'unavailable' }),
  create: async () => { throw new Error('Sharing is not connected.'); },
};

function safeLink(link: ReviewLink): ReviewLink {
  if (!link.id || !/^\/review\/[A-Za-z0-9_-]{16,256}$/.test(link.path) || !Number.isFinite(link.createdAt)) throw new Error('Invalid review link');
  return { id: link.id, path: link.path, canDownload: link.canDownload, protected: link.protected, createdAt: link.createdAt, ...(link.expiresAt === undefined ? {} : { expiresAt: link.expiresAt }) };
}

/** Server authorization and persistence remain the gateway's responsibility. */
export function createShareManagement(gateway: ShareGateway, onChange: (state: ShareManagementState) => void) {
  let projectId = '';
  let pending: AbortController | undefined;
  let disposed = false;
  let state: ShareManagementState = { kind: 'loading', links: [], creating: false };
  function publish(next: ShareManagementState) { state = next; onChange(next); }
  return {
    async load(id: string, allowed: boolean) {
      if (disposed) return;
      pending?.abort();
      pending = undefined;
      projectId = id;
      if (!allowed) { publish({ kind: 'denied', links: [], creating: false }); return; }
      publish({ kind: 'loading', links: [], creating: false });
      const controller = new AbortController();
      pending = controller;
      try {
        const result = await gateway.list(id, controller.signal);
        if (disposed || pending !== controller || controller.signal.aborted) return;
        publish({ ...result, links: result.kind === 'ready' ? result.links.map(safeLink) : [], creating: false });
      } catch {
        if (disposed || pending !== controller || controller.signal.aborted) return;
        publish({ kind: 'unavailable', links: [], creating: false, error: 'Could not load review links. Try again.' });
      } finally { if (pending === controller) pending = undefined; }
    },
    async create(draft: ShareDraft): Promise<boolean> {
      if (disposed || state.kind !== 'ready' || state.creating) return false;
      publish({ ...state, creating: true, error: undefined });
      const controller = new AbortController();
      pending = controller;
      try {
        const created = await gateway.create(projectId, {
          ...(draft.passcode ? { passcode: draft.passcode } : {}), canDownload: draft.canDownload,
          appearance: {
            gridSize: draft.appearance.size === 'small' ? 'sm' : draft.appearance.size === 'large' ? 'lg' : 'md',
            aspectRatio: draft.appearance.aspect === 'landscape' ? 'video' : draft.appearance.aspect,
            thumbnailScale: draft.appearance.fit, showCardInfo: draft.appearance.showInfo,
          },
        }, controller.signal);
        if (disposed || pending !== controller || controller.signal.aborted) return false;
        publish({ ...state, links: [safeLink(created), ...state.links], creating: false });
        return true;
      } catch {
        if (disposed || pending !== controller || controller.signal.aborted) return false;
        publish({ ...state, creating: false, error: 'Could not create the review link. Try again.' });
        return false;
      } finally { if (pending === controller) pending = undefined; }
    },
    dispose() { disposed = true; pending?.abort(); pending = undefined; projectId = ''; },
  };
}
