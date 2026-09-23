<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import { Dialog } from 'bits-ui';
  import { Link2, Copy, LockKeyhole, X } from 'lucide-svelte';
  import { createShareManagement, offlineShareGateway, type ShareGateway, type ShareManagementState, type ReviewLink } from '$lib/share-management';
  import type { AppearanceValue } from '$lib/appearance';

  let { projectId, projectTitle, canManage, appearance, defaultCanDownload = false, gateway = offlineShareGateway }: {
    projectId: string; projectTitle: string; canManage: boolean; appearance: AppearanceValue;
    defaultCanDownload?: boolean; gateway?: ShareGateway;
  } = $props();
  let open = $state(false), passcode = $state(''), canDownload = $state(false), copyMessage = $state('');
  let shareState = $state.raw<ShareManagementState>({ kind: 'loading', links: [], creating: false });
  let manager: ReturnType<typeof createShareManagement> | undefined;
  let origin = $state('');
  onMount(() => { origin = window.location.origin; });
  let draftProjectId = '';
  let generation = 0;
  function setOpen(next: boolean) {
    generation += 1;
    manager?.dispose(); manager = undefined;
    open = next && canManage;
    passcode = ''; copyMessage = ''; canDownload = defaultCanDownload;
    draftProjectId = open ? projectId : '';
    shareState = { kind: 'loading', links: [], creating: false };
    if (open) {
      manager = createShareManagement(gateway, nextState => { shareState = nextState; });
      void manager.load(projectId, canManage);
    }
  }
  $effect(() => {
    const id = projectId, allowed = canManage;
    untrack(() => { if (open && (!allowed || draftProjectId !== id)) setOpen(false); });
  });
  onDestroy(() => { generation += 1; manager?.dispose(); });
  async function create(event: SubmitEvent) {
    event.preventDefault();
    const current = manager, submitted = passcode;
    if (await current?.create({ passcode: submitted, canDownload, appearance })) {
      if (manager === current && passcode === submitted) passcode = '';
    }
  }
  async function copy(link: ReviewLink) {
    const current = generation;
    if (link.expiresAt !== undefined && link.expiresAt <= Date.now()) { copyMessage = 'This link has expired.'; return; }
    try {
      await navigator.clipboard.writeText(new URL(link.path, window.location.origin).href);
      if (current === generation) copyMessage = 'Review link copied.';
    } catch {
      if (current === generation) copyMessage = 'Could not copy. Select the link and copy it manually.';
    }
  }
</script>

{#if canManage}
<Dialog.Root {open} onOpenChange={setOpen}>
  <Dialog.Trigger class="share-trigger btn preset-tonal-surface" title="Share review" aria-label="Share review"><Link2 size={14}/><span>Share</span></Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay"/>
    <Dialog.Content class="filter-sheet share-sheet">
      <div class="sheet-heading"><Dialog.Title class="dialog-title">Share review</Dialog.Title><Dialog.Close class="share-close" aria-label="Close share review"><X size={16}/></Dialog.Close></div>
      <Dialog.Description>Project-wide review links for {projectTitle}.</Dialog.Description>
      {#if shareState.kind === 'loading'}<p role="status">Loading review links…</p>
      {:else if shareState.kind === 'denied'}<p role="status">Only the project owner can manage review links.</p>
      {:else if shareState.kind === 'unavailable'}
        <p role="status">{shareState.error ?? 'Sharing is unavailable in this local session. Connect the project backend to create review links.'}</p>
        {#if shareState.error}<button class="btn preset-tonal-surface" onclick={() => manager?.load(projectId, canManage)}>Retry</button>{/if}
      {:else}
        <form onsubmit={create} aria-busy={shareState.creating}>
          <label class="passcode-label">Passcode <span class="optional">Optional</span><input type="password" bind:value={passcode} maxlength="128" autocomplete="new-password" placeholder="Anyone with the link" disabled={shareState.creating}/></label>
          <label class="download-option"><input type="checkbox" bind:checked={canDownload} disabled={shareState.creating}/>Allow downloads</label>
          <p class="appearance-summary">Current appearance: {appearance.aspect}, {appearance.size}, {appearance.fit}{appearance.showInfo ? ', details shown' : ', details hidden'}.</p>
          <button class="btn preset-tonal-primary create-link" type="submit" disabled={shareState.creating}>{shareState.creating ? 'Creating…' : 'Create review link'}</button>
        </form>
        {#if shareState.error}<p class="share-error" role="alert">{shareState.error}</p>{/if}
        <section class="existing-links" aria-label="Existing review links">
          <h3>Review links <span>{shareState.links.length}</span></h3>
          {#if !shareState.links.length}<p>No review links yet.</p>{/if}
          {#each shareState.links as link (link.id)}
            {@const expired = link.expiresAt !== undefined && link.expiresAt <= Date.now()}
            <div class="link-row">
              <div class="link-details"><span>{new Date(link.createdAt).toLocaleDateString()}</span>{#if link.protected}<span><LockKeyhole size={11}/>Passcode</span>{/if}<span>{link.canDownload ? 'Downloads allowed' : 'Review only'}</span>{#if expired}<span>Expired</span>{:else if link.expiresAt}<span>Expires {new Date(link.expiresAt).toLocaleDateString()}</span>{/if}</div>
              <div class="link-address"><input readonly aria-label="Review link" value={`${origin}${link.path}`} onclick={event => event.currentTarget.select()}/><button class="btn preset-tonal-surface" aria-label={`Copy review link created ${new Date(link.createdAt).toLocaleDateString()}`} title="Copy review link" disabled={expired} onclick={() => copy(link)}><Copy size={14}/></button></div>
            </div>
          {/each}
        </section>
        <p class="copy-message" role="status">{copyMessage}</p>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
{/if}

<style>
  :global(.share-trigger) { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 9px; border: 1px solid var(--border); border-radius: 5px; color: var(--muted); background: var(--panel); font-size: 11px; }
  :global(.share-sheet) { width: min(430px, calc(100vw - 28px)); padding: 18px; background: linear-gradient(155deg, var(--raised), var(--panel) 45%); border-color: var(--border); border-radius: 10px; }
  :global(.share-close),button { display: inline-flex; align-items: center; justify-content: center; min-height: 28px; padding: 0 9px; border: 1px solid var(--border); border-radius: 5px; color: var(--ink); background: var(--raised); font: inherit; font-size: 11px; cursor: pointer; }
  :global(.share-close) { border: 0; padding: 0; width: 28px; background: transparent; }
  form { display: grid; gap: 12px; }
  p,label { font-size: 12px; color: var(--muted); line-height: 1.5; }
  .passcode-label { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; }
  .optional { margin-left: auto; font-size: 10px; }
  input:not([type='checkbox']) { min-width: 0; width: 100%; border: 1px solid var(--border); background: var(--canvas); color: var(--ink); border-radius: 5px; padding: 6px 9px; font-size: 12px; }
  .download-option { display: flex; align-items: center; gap: 8px; }
  input[type='checkbox'] { accent-color: var(--accent); }
  .appearance-summary { margin: 0; font-size: 11px; }
  .create-link { justify-self: start; background: color-mix(in srgb, var(--accent) 22%, var(--panel)); }
  button:disabled { opacity: .5; cursor: default; }
  .existing-links { border-top: 1px solid var(--border); margin-top: 18px; padding-top: 14px; }
  h3 { display: flex; justify-content: space-between; font-size: 12px; margin: 0 0 12px; }
  h3 span { color: var(--muted); }
  .link-row + .link-row { margin-top: 12px; }
  .link-details { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 5px; color: var(--muted); font-size: 10px; }
  .link-details span { display: inline-flex; align-items: center; gap: 3px; }
  .link-address { display: flex; gap: 5px; }
  .link-address button { flex: 0 0 30px; }
  .copy-message { min-height: 18px; margin-bottom: 0; }
  .share-error { color: var(--status-needs-changes, #e6a2a2); }
  button:focus-visible,input:focus-visible,:global(.share-trigger:focus-visible),:global(.share-close:focus-visible) { outline: 1px solid var(--accent); outline-offset: 2px; }
  @media(max-width: 760px) { :global(.share-sheet) { width: 100%; border-radius: 12px 12px 0 0; padding-bottom: max(18px, env(safe-area-inset-bottom)); } :global(.share-trigger span) { display: none; } }
  @media(pointer: coarse) { button,:global(.share-trigger),:global(.share-close) { min-height: 44px; min-width: 44px; } input:not([type='checkbox']) { min-height: 44px; font-size: 16px; } .download-option { min-height: 44px; } }
</style>
