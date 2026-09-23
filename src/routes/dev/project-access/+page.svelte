<script lang="ts">
  import ProjectAccessDialog from '$lib/components/ProjectAccessDialog.svelte';
  import type { ProjectAccessEntry, ProjectAccessGateway, ProjectAccessSnapshot } from '$lib/project-access';

  let owner = $state(true), failLoad = $state(false), failSave = $state(false), denied = $state(false), hold = $state(false), queued = $state(0);
  let projectId = $state('coast'), sequence = 0;
  let visibility: ProjectAccessSnapshot['visibility'] = 'private';
  let entries: ProjectAccessEntry[] = [
    { kind: 'owner', id: 'owner', name: 'Studio owner', email: 'owner@example.test', role: 'owner' },
    { kind: 'member', id: 'member', name: 'Alex Editor', email: 'alex@example.test', role: 'editor' },
  ];
  const releases = new Set<() => void>();
  const snapshot = (id: string): ProjectAccessSnapshot => ({ projectId: id, isOwner: owner, visibility, entries: [...entries] });
  const gateway: ProjectAccessGateway = {
    async list(id) {
      if (failLoad) { failLoad = false; throw new Error('Fixture load failure'); }
      return denied ? { kind: 'denied' } : { kind: 'ready', data: snapshot(id) };
    },
    async commit(id, action, signal) {
      if (hold) await new Promise<void>((resolve, reject) => {
        const cleanup = () => { releases.delete(release); queued = releases.size; signal.removeEventListener('abort', abort); };
        const release = () => { cleanup(); resolve(); };
        const abort = () => { cleanup(); reject(new Error('Cancelled')); };
        releases.add(release); queued = releases.size;
        if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
      });
      if (signal.aborted) throw new Error('Cancelled');
      if (!owner || denied) throw new Error('Not permitted');
      if (failSave) { failSave = false; throw new Error('Fixture save failure'); }
      if (action.type === 'set-visibility') visibility = action.visibility;
      if (action.type === 'add-member') {
        const pattern = action.identifier.trim().toLowerCase();
        if (pattern.includes('@')) entries = [...entries.filter(entry => entry.kind !== 'rule' || entry.pattern !== pattern), { kind: 'rule', id: `rule-${++sequence}`, pattern, role: action.role }];
        else entries = [...entries, { kind: 'member', id: `member-${++sequence}`, name: action.identifier, role: action.role }];
        if (visibility !== 'workspace') visibility = 'shared';
      }
      if (action.type === 'remove-member') entries = entries.filter(entry => entry.kind !== 'member' || entry.id !== action.membershipId);
      if (action.type === 'remove-rule') entries = entries.filter(entry => entry.kind !== 'rule' || entry.id !== action.ruleId);
      return snapshot(id);
    },
  };
</script>

<svelte:head><title>Project access — development checks</title><meta name="robots" content="noindex"/></svelte:head>
<main class="fixture"><h1>Local project-access fixture</h1><p>Test identities only. These controls do not change access to real projects.</p>
  <label><input type="checkbox" bind:checked={owner}/>Project owner</label>
  <label><input type="checkbox" bind:checked={denied}/>Deny access</label>
  <label><input type="checkbox" bind:checked={failLoad}/>Fail next load</label>
  <label><input type="checkbox" bind:checked={failSave}/>Fail next save</label>
  <label><input type="checkbox" bind:checked={hold}/>Hold saves</label>
  <button onclick={() => { for (const release of [...releases]) release(); }} disabled={!queued}>Release saves {queued}</button>
  <button onclick={() => projectId = projectId === 'coast' ? 'night' : 'coast'}>Switch project</button>
  <ProjectAccessDialog {projectId} projectTitle={projectId === 'coast' ? 'North coast' : 'Night studio'} {gateway}/>
</main>

<style>.fixture { padding: 24px; } label { display: inline-flex; align-items: center; gap: 6px; margin: 8px; } button { padding: 8px; }</style>
