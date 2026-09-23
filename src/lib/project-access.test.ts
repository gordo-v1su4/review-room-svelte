import { expect, test } from 'bun:test';
import { createProjectAccess, offlineProjectAccessGateway, type ProjectAccessSnapshot, type ProjectAccessState, type ProjectAccessAction } from './project-access';

const snapshot = (projectId = 'project', isOwner = true): ProjectAccessSnapshot => ({
  projectId, isOwner, visibility: 'private', entries: [
    { kind: 'owner', id: 'owner', name: 'River Lee', role: 'owner' },
    { kind: 'member', id: 'member', name: 'Alex Chen', email: 'alex@studio.test', role: 'editor' },
    { kind: 'rule', id: 'rule', pattern: '*@studio.test', role: 'viewer' },
  ],
});
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('authorized nonowners see owner, direct members and rules but cannot change access', async () => {
  let state!: ProjectAccessState;
  const listed = deferred<{ kind: 'ready'; data: ProjectAccessSnapshot }>();
  let writes = 0;
  const controller = createProjectAccess({ list: () => listed.promise, commit: async () => { writes++; return snapshot(); } }, next => state = next);
  const loading = controller.load('project');
  expect(state).toEqual({ kind: 'loading', data: null, busy: false });
  listed.resolve({ kind: 'ready', data: snapshot('project', false) }); await loading;
  expect(state.data?.entries).toEqual(snapshot().entries);
  for (const action of [
    { type: 'set-visibility', visibility: 'workspace' },
    { type: 'add-member', identifier: 'Someone', role: 'editor' },
    { type: 'remove-member', membershipId: 'member' },
    { type: 'remove-rule', ruleId: 'rule' },
  ] satisfies ProjectAccessAction[]) expect(await controller.commit(action)).toBe(false);
  expect(state.data?.visibility).toBe('private');
  expect(writes).toBe(0);
});

test('owners see visibility changes only after confirmation and cannot double-submit', async () => {
  let state!: ProjectAccessState;
  const saved = deferred<ProjectAccessSnapshot>();
  const commands: ProjectAccessAction[] = [];
  const controller = createProjectAccess({ list: async () => ({ kind: 'ready', data: snapshot() }), commit: async (_id, action) => {
    commands.push(action); return saved.promise;
  } }, next => state = next);
  await controller.load('project');
  const saving = controller.commit({ type: 'set-visibility', visibility: 'workspace' });
  expect(state.busy).toBe(true);
  expect(state.data?.visibility).toBe('private');
  expect(await controller.commit({ type: 'set-visibility', visibility: 'shared' })).toBe(false);
  expect(commands).toEqual([{ type: 'set-visibility', visibility: 'workspace' }]);
  saved.resolve({ ...snapshot(), visibility: 'workspace' });
  expect(await saving).toBe(true);
  expect(state.data?.visibility).toBe('workspace');
  expect(state.busy).toBe(false);
});

test('adding accepts names, emails and domain rules and uses confirmed visibility', async () => {
  for (const identifier of ['  María O’Neill  ', 'A Person With Spaces', 'editor+review@studio.test', '*@studio.test', '@studio.test', 'studio.test']) {
    let state!: ProjectAccessState;
    let received: ProjectAccessAction | undefined;
    const controller = createProjectAccess({ list: async () => ({ kind: 'ready', data: snapshot() }), commit: async (_id, action) => {
      received = action;
      return { ...snapshot(), visibility: 'shared', entries: [...snapshot().entries, { kind: 'member', id: 'new', name: 'Confirmed user', role: 'viewer' }] };
    } }, next => state = next);
    await controller.load('project');
    expect(await controller.commit({ type: 'add-member', identifier, role: 'viewer' })).toBe(true);
    expect(received).toEqual({ type: 'add-member', identifier: identifier.trim(), role: 'viewer' });
    expect(state.data?.visibility).toBe('shared');
    expect(state.data?.entries.at(-1)?.id).toBe('new');
  }
});

test('owner and unrelated entries cannot be removed and invalid access changes never reach the gateway', async () => {
  let state!: ProjectAccessState;
  let writes = 0;
  const controller = createProjectAccess({ list: async () => ({ kind: 'ready', data: snapshot() }), commit: async () => { writes++; return snapshot(); } }, next => state = next);
  await controller.load('project');
  for (const action of [
    { type: 'remove-member', membershipId: 'owner' },
    { type: 'remove-member', membershipId: 'rule' },
    { type: 'remove-rule', ruleId: 'member' },
    { type: 'remove-rule', ruleId: 'foreign' },
    { type: 'add-member', identifier: '  ', role: 'editor' },
    { type: 'add-member', identifier: 'Valid name', role: 'owner' },
    { type: 'set-visibility', visibility: 'public' },
  ] as ProjectAccessAction[]) expect(await controller.commit(action)).toBe(false);
  expect(writes).toBe(0);
  expect(state.data).toEqual(snapshot());
  expect(state.busy).toBe(false);
  expect(state.error).toBeTruthy();
});

test('failed loading and writes offer retry without leaking errors or losing confirmed access', async () => {
  let state!: ProjectAccessState;
  let fail = true;
  const controller = createProjectAccess({
    list: async () => { if (fail) throw new Error('secret authorization details'); return { kind: 'ready', data: snapshot() }; },
    commit: async () => { if (fail) throw new Error('secret storage details'); return { ...snapshot(), visibility: 'shared' }; },
  }, next => state = next);
  await expect(controller.load('project')).resolves.toBeUndefined();
  expect(state).toEqual({ kind: 'unavailable', data: null, busy: false, error: 'Could not load project access. Try again.' });
  fail = false; await controller.load('project');
  expect(state.data).toEqual(snapshot());
  fail = true;
  expect(await controller.commit({ type: 'set-visibility', visibility: 'shared' })).toBe(false);
  expect(state.data).toEqual(snapshot());
  expect(state.busy).toBe(false);
  expect(state.error).toBe('Could not save project access. Try again.');
  fail = false;
  expect(await controller.commit({ type: 'set-visibility', visibility: 'shared' })).toBe(true);
  expect(state.data?.visibility).toBe('shared');
  expect(state.error).toBeUndefined();
});

test('switching project cancels requests and ignores late lists and saves', async () => {
  let state!: ProjectAccessState;
  const oldList = deferred<{ kind: 'ready'; data: ProjectAccessSnapshot }>(), oldSave = deferred<ProjectAccessSnapshot>();
  const signals: AbortSignal[] = [];
  const controller = createProjectAccess({
    list: (id, signal) => { signals.push(signal); return id === 'old' ? oldList.promise : Promise.resolve({ kind: 'ready', data: snapshot(id) }); },
    commit: (_id, _action, signal) => { signals.push(signal); return oldSave.promise; },
  }, next => state = next);
  const initial = controller.load('old');
  await controller.load('current');
  expect(signals[0].aborted).toBe(true);
  oldList.resolve({ kind: 'ready', data: snapshot('old') }); await initial;
  expect(state.data?.projectId).toBe('current');
  const saving = controller.commit({ type: 'set-visibility', visibility: 'shared' });
  await controller.load('other');
  expect(signals[2].aborted).toBe(true);
  oldSave.resolve({ ...snapshot('current'), visibility: 'shared' });
  expect(await saving).toBe(false);
  expect(state.data).toEqual(snapshot('other'));
});

test('offline access fails closed and never presents a mutation as saved', async () => {
  let state!: ProjectAccessState;
  const controller = createProjectAccess(offlineProjectAccessGateway, next => state = next);
  await controller.load('project');
  expect(state).toEqual({ kind: 'unavailable', data: null, busy: false });
  expect(await controller.commit({ type: 'set-visibility', visibility: 'workspace' })).toBe(false);
  await expect(offlineProjectAccessGateway.commit('project', { type: 'set-visibility', visibility: 'workspace' }, new AbortController().signal)).rejects.toThrow();
});

test('disposing cancels pending work, suppresses late errors and prevents subsequent requests', async () => {
  const states: ProjectAccessState[] = [];
  const saving = deferred<ProjectAccessSnapshot>();
  let saveSignal!: AbortSignal;
  let lists = 0;
  const controller = createProjectAccess({
    list: async () => { lists++; return { kind: 'ready', data: snapshot() }; },
    commit: (_id, _action, signal) => { saveSignal = signal; return saving.promise; },
  }, state => states.push(state));
  await controller.load('project');
  const pending = controller.commit({ type: 'remove-member', membershipId: 'member' });
  const count = states.length;
  controller.dispose();
  expect(saveSignal.aborted).toBe(true);
  saving.reject(new Error('late failure'));
  expect(await pending).toBe(false);
  await controller.load('next');
  expect(await controller.commit({ type: 'remove-rule', ruleId: 'rule' })).toBe(false);
  expect(states).toHaveLength(count);
  expect(lists).toBe(1);
});

test('a mismatched project or missing owner in gateway data cannot become confirmed access', async () => {
  let state!: ProjectAccessState;
  let data = snapshot('foreign');
  const controller = createProjectAccess({ list: async () => ({ kind: 'ready', data }), commit: async () => snapshot('foreign') }, next => state = next);
  await controller.load('project');
  expect(state.kind).toBe('unavailable');
  expect(state.data).toBeNull();
  data = { ...snapshot(), entries: snapshot().entries.filter(entry => entry.kind !== 'owner') };
  await controller.load('project');
  expect(state.kind).toBe('unavailable');
  data = snapshot(); await controller.load('project');
  expect(await controller.commit({ type: 'set-visibility', visibility: 'shared' })).toBe(false);
  expect(state.data).toEqual(snapshot());
});

test('confirmed member and rule removals retain the owner and existing visibility', async () => {
  for (const action of [{ type: 'remove-member', membershipId: 'member' }, { type: 'remove-rule', ruleId: 'rule' }] as const) {
    let state!: ProjectAccessState;
    const response = deferred<ProjectAccessSnapshot>();
    const controller = createProjectAccess({ list: async () => ({ kind: 'ready', data: { ...snapshot(), visibility: 'workspace' } }), commit: () => response.promise }, next => state = next);
    await controller.load('project');
    const saving = controller.commit(action);
    expect(state.data?.entries).toHaveLength(3);
    const removed = action.type === 'remove-member' ? 'member' : 'rule';
    response.resolve({ ...snapshot(), visibility: 'workspace', entries: snapshot().entries.filter(entry => entry.id !== removed) });
    expect(await saving).toBe(true);
    expect(state.data?.entries.map(entry => entry.kind)).toEqual(action.type === 'remove-member' ? ['owner', 'rule'] : ['owner', 'member']);
    expect(state.data?.visibility).toBe('workspace');
  }
});

test('confirmed authority loss makes subsequent access changes read-only', async () => {
  let state!: ProjectAccessState;
  let writes = 0;
  const controller = createProjectAccess({ list: async () => ({ kind: 'ready', data: { ...snapshot(), visibility: 'workspace' } }), commit: async () => {
    writes++; return { ...snapshot('project', false), visibility: 'workspace' };
  } }, next => state = next);
  await controller.load('project');
  expect(await controller.commit({ type: 'add-member', identifier: 'Morgan Lee', role: 'editor' })).toBe(true);
  expect(state.data?.visibility).toBe('workspace');
  expect(state.data?.isOwner).toBe(false);
  expect(await controller.commit({ type: 'remove-member', membershipId: 'member' })).toBe(false);
  expect(writes).toBe(1);
});

test('denied access clears previous project details without requesting or permitting writes', async () => {
  let state!: ProjectAccessState;
  let lists = 0;
  const controller = createProjectAccess({ list: async () => { lists++; return { kind: 'ready', data: snapshot() }; }, commit: async () => { throw new Error('must not write'); } }, next => state = next);
  await controller.load('project');
  await controller.load('denied', false);
  expect(state).toEqual({ kind: 'denied', data: null, busy: false });
  expect(await controller.commit({ type: 'set-visibility', visibility: 'shared' })).toBe(false);
  expect(lists).toBe(1);
});
