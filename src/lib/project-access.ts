export type ProjectVisibility = 'private' | 'shared' | 'workspace';
export type ProjectMemberRole = 'editor' | 'viewer';
export type ProjectAccessEntry =
  | Readonly<{ kind: 'owner'; id: string; name: string; email?: string; role: 'owner' }>
  | Readonly<{ kind: 'member'; id: string; name: string; email?: string; role: ProjectMemberRole }>
  | Readonly<{ kind: 'rule'; id: string; pattern: string; role: ProjectMemberRole }>;
export type ProjectAccessSnapshot = Readonly<{
  projectId: string;
  /** Server-confirmed management authorization: admin AND project owner. */
  isOwner: boolean;
  visibility: ProjectVisibility;
  entries: readonly ProjectAccessEntry[];
}>;
export type ProjectAccessAction =
  | Readonly<{ type: 'set-visibility'; visibility: ProjectVisibility }>
  | Readonly<{ type: 'add-member'; identifier: string; role: ProjectMemberRole }>
  | Readonly<{ type: 'remove-member'; membershipId: string }>
  | Readonly<{ type: 'remove-rule'; ruleId: string }>;
export type ProjectAccessList = { kind: 'ready'; data: ProjectAccessSnapshot } | { kind: 'denied' | 'unavailable' };
export interface ProjectAccessGateway {
  list(projectId: string, signal: AbortSignal): Promise<ProjectAccessList>;
  /** Authorize, mutate, then reread the confirmed project access in the adapter. */
  commit(projectId: string, action: ProjectAccessAction, signal: AbortSignal): Promise<ProjectAccessSnapshot>;
}
export type ProjectAccessState = Readonly<{
  kind: 'loading' | 'ready' | 'denied' | 'unavailable';
  data: ProjectAccessSnapshot | null;
  busy: boolean;
  error?: string;
}>;

export const offlineProjectAccessGateway: ProjectAccessGateway = {
  list: async () => ({ kind: 'unavailable' }),
  commit: async () => { throw new Error('Project access is not connected.'); },
};

function validAction(action: ProjectAccessAction, data: ProjectAccessSnapshot): boolean {
  switch (action.type) {
    case 'set-visibility': return ['private', 'shared', 'workspace'].includes(action.visibility);
    case 'add-member': return typeof action.identifier === 'string' && !!action.identifier.trim() && ['editor', 'viewer'].includes(action.role);
    case 'remove-member': return data.entries.some(entry => entry.kind === 'member' && entry.id === action.membershipId);
    case 'remove-rule': return data.entries.some(entry => entry.kind === 'rule' && entry.id === action.ruleId);
    default: return false;
  }
}

function confirmedSnapshot(data: ProjectAccessSnapshot, projectId: string): ProjectAccessSnapshot {
  if (data.projectId !== projectId || typeof data.isOwner !== 'boolean' || !['private', 'shared', 'workspace'].includes(data.visibility) || !Array.isArray(data.entries)) throw new Error('Invalid project access');
  const keys = new Set<string>();
  const entries = data.entries.map((entry): ProjectAccessEntry => {
    const key = `${entry.kind}:${entry.id}`;
    if (typeof entry.id !== 'string' || !entry.id || keys.has(key)) throw new Error('Invalid access entry');
    keys.add(key);
    if (entry.kind === 'rule' && ['editor', 'viewer'].includes(entry.role) && typeof entry.pattern === 'string' && entry.pattern.trim()) {
      return { kind: 'rule', id: entry.id, pattern: entry.pattern, role: entry.role };
    }
    if ((entry.kind === 'owner' && entry.role === 'owner') || (entry.kind === 'member' && ['editor', 'viewer'].includes(entry.role))) {
      if (typeof entry.name !== 'string' || (entry.email !== undefined && typeof entry.email !== 'string')) throw new Error('Invalid access identity');
      return { kind: entry.kind, id: entry.id, name: entry.name, role: entry.role, ...(entry.email === undefined ? {} : { email: entry.email }) } as ProjectAccessEntry;
    }
    throw new Error('Invalid access entry');
  });
  if (entries.filter(entry => entry.kind === 'owner').length !== 1) throw new Error('Invalid project owner');
  return { projectId, isOwner: data.isOwner, visibility: data.visibility, entries };
}

export function createProjectAccess(gateway: ProjectAccessGateway, onChange: (state: ProjectAccessState) => void) {
  let state: ProjectAccessState = { kind: 'loading', data: null, busy: false };
  let pending: AbortController | undefined;
  let disposed = false;
  function publish(next: ProjectAccessState) { state = next; onChange(next); }
  return {
    async load(projectId: string, allowed = true) {
      if (disposed) return;
      pending?.abort();
      pending = undefined;
      if (!allowed) { publish({ kind: 'denied', data: null, busy: false }); return; }
      publish({ kind: 'loading', data: null, busy: false });
      const controller = new AbortController();
      pending = controller;
      try {
        const result = await gateway.list(projectId, controller.signal);
        if (pending !== controller || controller.signal.aborted) return;
        publish({ kind: result.kind, data: result.kind === 'ready' ? confirmedSnapshot(result.data, projectId) : null, busy: false });
      } catch {
        if (pending !== controller || controller.signal.aborted) return;
        publish({ kind: 'unavailable', data: null, busy: false, error: 'Could not load project access. Try again.' });
      } finally { if (pending === controller) pending = undefined; }
    },
    async commit(action: ProjectAccessAction): Promise<boolean> {
      if (disposed || state.kind !== 'ready' || !state.data?.isOwner || state.busy) return false;
      if (!validAction(action, state.data)) {
        publish({ ...state, error: 'Choose an existing member or rule, a visibility option, or enter a name, email or domain.' });
        return false;
      }
      const projectId = state.data.projectId;
      publish({ ...state, busy: true, error: undefined });
      const request = action.type === 'add-member' ? { ...action, identifier: action.identifier.trim() } : action;
      const controller = new AbortController();
      pending = controller;
      try {
        const data = await gateway.commit(projectId, request, controller.signal);
        if (pending !== controller || controller.signal.aborted) return false;
        publish({ kind: 'ready', data: confirmedSnapshot(data, projectId), busy: false });
        return true;
      } catch {
        if (pending !== controller || controller.signal.aborted) return false;
        publish({ ...state, busy: false, error: 'Could not save project access. Try again.' });
        return false;
      } finally { if (pending === controller) pending = undefined; }
    },
    dispose() { disposed = true; pending?.abort(); pending = undefined; },
  };
}
