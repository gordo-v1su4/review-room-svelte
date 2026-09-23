<script lang="ts">
  import { onDestroy, tick, untrack } from 'svelte';
  import { Dialog } from 'bits-ui';
  import { UsersRound, X, LockKeyhole, Globe2, Users } from 'lucide-svelte';
  import { createProjectAccess, offlineProjectAccessGateway, type ProjectAccessGateway, type ProjectAccessState, type ProjectAccessAction, type ProjectMemberRole, type ProjectVisibility } from '$lib/project-access';

  let { projectId, projectTitle, gateway = offlineProjectAccessGateway }: {
    projectId: string; projectTitle: string; gateway?: ProjectAccessGateway;
  } = $props();
  let open = $state(false), identifier = $state(''), role = $state<ProjectMemberRole>('editor'), message = $state('');
  let access = $state.raw<ProjectAccessState>({ kind: 'loading', data: null, busy: false });
  let manager: ReturnType<typeof createProjectAccess> | undefined;
  let draftProject = '';
  let memberInput = $state<HTMLInputElement | null>(null);
  const visibilityOptions = [
    { id: 'private', label: 'Private', icon: LockKeyhole, detail: 'Only the owner can open this project. Existing members and rules remain saved.' },
    { id: 'shared', label: 'Shared', icon: Users, detail: 'The owner, members and matching email rules can open this project.' },
    { id: 'workspace', label: 'Workspace', icon: Globe2, detail: 'Signed-in workspace users can view this project. Member roles still apply.' },
  ] as const;
  function setOpen(next: boolean) {
    manager?.dispose(); manager = undefined;
    open = next; identifier = ''; role = 'editor'; message = '';
    draftProject = next ? projectId : '';
    access = { kind: 'loading', data: null, busy: false };
    if (next) {
      manager = createProjectAccess(gateway, state => { access = state; });
      void manager.load(projectId);
    }
  }
  $effect(() => {
    const id = projectId;
    untrack(() => { if (open && id !== draftProject) setOpen(false); });
  });
  onDestroy(() => manager?.dispose());
  async function save(action: ProjectAccessAction, success: string) {
    const current = manager;
    message = '';
    const saved = await current?.commit(action);
    if (current !== manager || !open) return false;
    if (saved) {
      message = success;
    }
    if (action.type === 'remove-member' || action.type === 'remove-rule') { await tick(); if (open && manager === current) memberInput?.focus(); }
    return saved;
  }
  async function add(event: SubmitEvent) {
    event.preventDefault();
    const current = manager;
    const submitted = identifier;
    if (await save({ type: 'add-member', identifier: submitted, role }, 'Project access updated.')) {
      if (identifier === submitted) identifier = '';
    }
    await tick();
    if (open && manager === current) memberInput?.focus();
  }
  async function visibility(next: ProjectVisibility, target: HTMLButtonElement) {
    const current = manager;
    await save({ type: 'set-visibility', visibility: next }, 'Visibility updated.');
    await tick();
    if (open && manager === current && target.isConnected) target.focus();
  }
</script>

<Dialog.Root {open} onOpenChange={setOpen}>
  <Dialog.Trigger class="access-trigger btn preset-tonal-surface" aria-label="Project access" title="Project access"><UsersRound size={14}/></Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay"/>
    <Dialog.Content class="filter-sheet access-sheet">
      <div class="sheet-heading"><Dialog.Title class="dialog-title">Project access</Dialog.Title><Dialog.Close class="access-close" aria-label="Close project access"><X size={16}/></Dialog.Close></div>
      <Dialog.Description>Who can open {projectTitle} inside the workspace.</Dialog.Description>
      {#if access.kind === 'loading'}<p role="status">Loading project access…</p>
      {:else if access.kind === 'denied'}<p role="status">You don’t have access to this project.</p>
      {:else if access.kind === 'unavailable'}
        <p role="status">{access.error ?? 'Project access is unavailable in this local session. Connect your workspace to manage members and visibility.'}</p>
        {#if access.error}<button class="btn preset-tonal-surface" onclick={() => manager?.load(projectId)}>Retry</button>{/if}
      {:else if access.data}
        <section aria-label="Project visibility" aria-busy={access.busy}>
          <h3>Visibility</h3>
          {#if access.data.isOwner}
            <div class="visibility-options" role="group" aria-label="Visibility">
              {#each visibilityOptions as option (option.id)}
                <button type="button" class="btn preset-tonal-surface" aria-pressed={access.data.visibility === option.id} disabled={access.busy} onclick={event => visibility(option.id, event.currentTarget)}><option.icon size={13}/>{option.label}</button>
              {/each}
            </div>
          {:else}<p class="read-only-visibility">{visibilityOptions.find(option => option.id === access.data?.visibility)?.label}<span>Only the owner can change access.</span></p>{/if}
          <p class="visibility-help">{visibilityOptions.find(option => option.id === access.data?.visibility)?.detail}</p>
        </section>
        {#if access.data.isOwner}
          <form onsubmit={add} aria-busy={access.busy}>
            <label for="project-member-identifier">Add a person or email rule</label>
            <input id="project-member-identifier" bind:this={memberInput} bind:value={identifier} placeholder="Email, name or *@studio.com" autocomplete="off" disabled={access.busy} aria-describedby="project-access-rule-help"/>
            <div class="add-actions"><label>Role<select bind:value={role} disabled={access.busy}><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label><button type="submit" class="btn preset-tonal-primary" disabled={access.busy || !identifier.trim()}>{access.busy ? 'Saving…' : 'Add access'}</button></div>
            <p id="project-access-rule-help" class="rule-help">Names match existing users. Email rules apply when a matching user signs in. Adding access makes a private project shared.</p>
          </form>
        {/if}
        {#if access.error}<p class="access-error" role="alert">{access.error}</p>{/if}
        <section class="member-section" aria-label="People and email rules" aria-busy={access.busy}>
          <h3>People & rules <span>{access.data.entries.length}</span></h3>
          <ul>
            {#each access.data.entries as entry (`${entry.kind}:${entry.id}`)}
              {@const name = entry.kind === 'rule' ? entry.pattern : entry.name}
              <li><div class="member-copy"><strong title={name}>{name}</strong>{#if entry.kind === 'rule'}<span>Email rule</span>{:else if entry.email}<span title={entry.email}>{entry.email}</span>{/if}</div><span class="member-role">{entry.role}</span>
                {#if access.data.isOwner && entry.kind !== 'owner'}<button type="button" class="remove-member" aria-label={`Remove ${name}`} title={`Remove ${name}`} disabled={access.busy} onclick={() => save(entry.kind === 'rule' ? { type: 'remove-rule', ruleId: entry.id } : { type: 'remove-member', membershipId: entry.id }, 'Access removed.')}><X size={13}/></button>{/if}
              </li>
            {/each}
          </ul>
        </section>
        <p class="save-message" role="status">{message}</p>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.access-trigger) { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; height: 28px; width: 28px; padding: 0; border: 1px solid var(--control-edge-side); border-top-color: var(--control-edge-top); border-bottom-color: var(--control-edge-bottom); border-radius: 5px; color: var(--muted); background: var(--panel); }
  :global(.access-sheet) { width: min(430px, calc(100vw - 28px)); padding: 18px; background: linear-gradient(155deg, var(--raised), var(--panel) 45%); border-color: var(--border); border-radius: 10px; }
  :global(.access-close),button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 28px; padding: 0 9px; border: 1px solid var(--control-edge-side); border-top-color: var(--control-edge-top); border-bottom-color: var(--control-edge-bottom); border-radius: 5px; color: var(--ink); background: var(--raised); font-size: 11px; }
  :global(.access-close) { border: 0; padding: 0; width: 28px; background: transparent; }
  h3 { display: flex; justify-content: space-between; margin: 16px 0 8px; font-size: 12px; font-weight: 550; }
  h3 span { color: var(--muted); font-weight: 400; }
  p,label { font-size: 12px; color: var(--muted); line-height: 1.5; }
  .visibility-options { display: flex; gap: 5px; }
  .visibility-options button { flex: 1; padding-inline: 5px; white-space: nowrap; }
  .visibility-options button[aria-pressed='true'] { background: color-mix(in srgb, var(--accent) 24%, var(--panel)); color: var(--ink); }
  .visibility-help,.rule-help { font-size: 11px; margin: 8px 0; }
  .read-only-visibility { color: var(--ink); }
  .read-only-visibility span { display: block; font-size: 11px; color: var(--muted); }
  form { display: grid; gap: 7px; margin-top: 18px; }
  input,select { min-width: 0; border: 1px solid var(--border); background: var(--canvas); color: var(--ink); border-radius: 5px; padding: 6px 9px; font-size: 12px; }
  input { width: 100%; }
  .add-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .add-actions label { display: flex; align-items: center; gap: 8px; }
  .add-actions button { background: color-mix(in srgb, var(--accent) 22%, var(--panel)); }
  .member-section { border-top: 1px solid var(--border); margin-top: 12px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 5px 0; }
  .member-copy { display: grid; gap: 3px; min-width: 0; flex: 1; }
  .member-copy strong,.member-copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .member-copy strong { font-size: 12px; font-weight: 500; }
  .member-copy span,.member-role { font-size: 10px; color: var(--muted); }
  .member-role { text-transform: capitalize; }
  .remove-member { width: 28px; padding: 0; border: 0; background: transparent; }
  .save-message { min-height: 18px; margin-bottom: 0; }
  .access-error { color: var(--status-needs-changes); }
  button:focus-visible,input:focus-visible,select:focus-visible,:global(.access-trigger:focus-visible),:global(.access-close:focus-visible) { outline: 1px solid var(--focus-ring); outline-offset: 2px; }
  @media(max-width: 760px) { :global(.access-sheet) { width: 100%; border-radius: 10px 10px 0 0; padding-bottom: max(18px, env(safe-area-inset-bottom)); } }
  @media(pointer: coarse) { button,:global(.access-trigger),:global(.access-close) { min-height: 44px; min-width: 44px; } input,select { min-height: 44px; font-size: 16px; } }
</style>
