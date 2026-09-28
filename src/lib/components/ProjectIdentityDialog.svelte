<script lang="ts">
  import { onDestroy, tick, untrack } from 'svelte';
  import { Dialog } from 'bits-ui';
  import { Archive, ImagePlus, Settings2, X } from 'lucide-svelte';
  import type { ProjectIdentity, ProjectIdentityDraft } from '$lib/project-identity';

  let { project, canEdit, onSave, canArchive = false, persistent = false, onArchive, onArchiveFocus, open = $bindable(false) }: {
    project: ProjectIdentity;
    canEdit: boolean;
    onSave: (draft: ProjectIdentityDraft) => Promise<void>;
    canArchive?: boolean;
    persistent?: boolean;
    onArchive?: () => void;
    onArchiveFocus?: () => void;
    open?: boolean;
  } = $props();

  let busy = $state(false);
  let confirmingArchive = $state(false);
  let error = $state('');
  let name = $state('');
  let clientName = $state('');
  let description = $state('');
  let brandColor = $state('#14b8a6');
  let banner = $state<File | null | undefined>();
  let stagedUrl = $state('');
  let bannerInput: HTMLInputElement | undefined;
  let nameInput: HTMLInputElement | undefined;
  let draftProjectId = '';
  let session = 0;
  let archivedOnClose = false;
  const preview = $derived(banner === null ? undefined : stagedUrl || project.bannerUrl);

  function releasePreview() {
    if (stagedUrl) URL.revokeObjectURL(stagedUrl);
    stagedUrl = '';
  }
  function setOpen(next: boolean) {
    if (next && !canEdit) return;
    session += 1;
    releasePreview();
    banner = undefined; error = ''; busy = false; confirmingArchive = false;
    name = next ? project.name : '';
    clientName = next ? project.clientName ?? '' : '';
    description = next ? project.description ?? '' : '';
    brandColor = next ? project.brandColor || '#14b8a6' : '#14b8a6';
    draftProjectId = next ? project.id : '';
    open = next;
  }
  $effect(() => {
    const projectId = project.id;
    const requestedOpen = open;
    const editable = canEdit;
    untrack(() => {
      if (requestedOpen && !editable) setOpen(false);
      else if (requestedOpen && !draftProjectId) setOpen(true);
      else if (draftProjectId && (!requestedOpen || draftProjectId !== projectId)) setOpen(false);
    });
  });
  onDestroy(() => { session += 1; releasePreview(); });
  async function focusName(event: Event) {
    event.preventDefault();
    await tick();
    if (open) { nameInput?.focus(); nameInput?.select(); }
  }

  function chooseBanner(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || busy || !canEdit) return;
    if (!file.type.startsWith('image/')) { error = 'Choose an image for the banner.'; return; }
    releasePreview();
    banner = file;
    stagedUrl = URL.createObjectURL(file);
    error = '';
  }
  function removeBanner() {
    if (busy || !canEdit) return;
    releasePreview(); banner = null; error = '';
  }
  function archive() {
    if (busy || !canEdit || !canArchive || !onArchive || project.id !== draftProjectId) return;
    try {
      onArchive();
      archivedOnClose = true;
      setOpen(false);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Could not archive the project.';
    }
  }
  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (busy || confirmingArchive) return;
    if (!canEdit || project.id !== draftProjectId) { error = 'Project editing is unavailable.'; return; }
    if (!name.trim()) { error = 'Enter a project name.'; return; }
    const request = session;
    const draft: ProjectIdentityDraft = { name: name.trim(), clientName: clientName.trim(), description: description.trim(), brandColor, ...(banner === undefined ? {} : { banner }) };
    busy = true; error = '';
    try {
      await onSave(draft);
      if (request === session) setOpen(false);
    } catch (cause) {
      if (request === session && open) error = cause instanceof Error ? cause.message : 'Could not save the project.';
    } finally {
      if (request === session) busy = false;
    }
  }
</script>

<Dialog.Root {open} onOpenChange={setOpen}>
  <Dialog.Trigger class="identity-trigger" aria-label="Project settings" title="Project settings" disabled={!canEdit}><Settings2 size={15}/></Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay"/>
    <Dialog.Content class="filter-sheet identity-sheet" onOpenAutoFocus={focusName} onCloseAutoFocus={event => {
      if (archivedOnClose && onArchiveFocus) { event.preventDefault(); onArchiveFocus(); }
      archivedOnClose = false;
    }}>
      <div class="sheet-heading"><Dialog.Title class="dialog-title">Project settings</Dialog.Title><Dialog.Close class="identity-close" aria-label="Close project settings"><X size={17}/></Dialog.Close></div>
      <Dialog.Description>{persistent ? 'Project identity is saved privately.' : 'Project identity. Changes are stored in this tab.'}</Dialog.Description>
      <form onsubmit={save} aria-busy={busy}>
        <fieldset disabled={busy || !canEdit || confirmingArchive}>
          <label>Project name<input bind:this={nameInput} bind:value={name} required maxlength="100" autocomplete="off"/></label>
          <label>Client<input bind:value={clientName} maxlength="100" autocomplete="organization" placeholder="Optional"/></label>
          <label>Description<textarea bind:value={description} rows="3" maxlength="2000" placeholder="Optional"></textarea></label>
          <label class="color-field"><span>Brand color</span><input type="color" bind:value={brandColor}/><span class="color-value">{brandColor}</span></label>
          {#if !persistent}<div class="banner-field">
            <span>Banner</span>
            {#if preview}<img class="banner-preview" src={preview} alt="Project banner preview"/>{/if}
            <input bind:this={bannerInput} type="file" accept="image/*" aria-label="Project banner image" hidden onchange={chooseBanner}/>
            <div class="banner-actions"><button type="button" onclick={() => bannerInput?.click()}><ImagePlus size={14}/>{preview ? 'Replace image' : 'Choose image'}</button><button type="button" disabled={!preview} onclick={removeBanner}>Remove</button></div>
          </div>{/if}
        </fieldset>
        {#if error}<p class="identity-error" role="alert">{error}</p>{/if}
        {#if canEdit && canArchive && onArchive}
          <div class="archive-section">
            {#if confirmingArchive}
              <p class="archive-description">Archive {project.name}? You can restore it from Archived projects. Unsaved settings will be discarded.</p>
              <div class="archive-actions"><button type="button" onclick={() => { confirmingArchive = false; error = ''; }}>Keep project</button><button class="archive-confirm" type="button" onclick={archive}><Archive size={13}/>Confirm archive</button></div>
            {:else}
              <button class="archive-start" type="button" disabled={busy} onclick={() => { confirmingArchive = true; error = ''; }}><Archive size={13}/>Archive project</button>
            {/if}
          </div>
        {/if}
        <div class="identity-actions"><Dialog.Close class="identity-cancel" type="button">Cancel</Dialog.Close><button class="identity-save" type="submit" disabled={busy || confirmingArchive || !canEdit || !name.trim()}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.identity-trigger),:global(.identity-close) { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 1px solid var(--border); border-radius: 5px; color: var(--muted); background: var(--panel); cursor: pointer; }
  :global(.identity-trigger:hover),:global(.identity-close:hover) { background: var(--raised); color: var(--ink); }
  :global(.identity-trigger:disabled) { opacity: .4; cursor: default; }
  :global(.identity-sheet) { width: min(410px, calc(100vw - 28px)); padding: 18px; background: linear-gradient(155deg, var(--raised), var(--panel) 45%); border-color: var(--border); border-radius: 10px; box-shadow: inset 0 1px #d3eee609, 0 16px 50px #0006; }
  :global(.identity-sheet .dialog-title) { margin: 0; font-size: 15px; font-weight: 550; }
  :global(.identity-close) { border: 0; background: transparent; }
  fieldset { display: grid; gap: 11px; padding: 0; margin: 0; border: 0; min-width: 0; }
  label,.banner-field { display: grid; gap: 6px; color: var(--muted); font-size: 11px; }
  input:not([type='color']),textarea { width: 100%; min-width: 0; padding: 6px 9px; border: 1px solid var(--border); border-radius: 5px; background: var(--canvas); color: var(--ink); font: inherit; font-size: 12px; }
  textarea { resize: vertical; min-height: 68px; max-height: 180px; }
  .color-field { display: flex; align-items: center; gap: 10px; }
  .color-field > span:first-child { margin-right: auto; }
  input[type='color'] { padding: 2px; width: 34px; height: 28px; border: 1px solid var(--border); border-radius: 4px; background: var(--canvas); cursor: pointer; }
  .color-value { width: 62px; font-variant-numeric: tabular-nums; }
  .banner-preview { width: 100%; height: 92px; object-fit: cover; border: 1px solid var(--border); border-radius: 5px; }
  .banner-actions,.identity-actions { display: flex; align-items: center; gap: 7px; }
  .identity-actions { justify-content: flex-end; margin-top: 14px; }
  button,:global(.identity-cancel) { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 28px; min-height: 28px; padding: 0 10px; border: 1px solid var(--border); border-radius: 5px; background: var(--raised); color: var(--ink); font: inherit; font-size: 11px; cursor: pointer; }
  .identity-save { background: color-mix(in srgb, var(--accent) 22%, var(--panel)); }
  .archive-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
  .archive-description { margin: 0 0 9px; color: var(--muted); font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
  .archive-actions { display: flex; gap: 7px; flex-wrap: wrap; }
  .archive-start { background: transparent; color: var(--muted); }
  .archive-confirm { background: color-mix(in srgb, var(--accent) 16%, var(--panel)); }
  button:disabled { opacity: .4; cursor: default; }
  .identity-error { color: #e6a2a2; font-size: 12px; line-height: 1.5; margin: 12px 0 0; }
  button:focus-visible,input:focus-visible,textarea:focus-visible,:global(.identity-trigger:focus-visible),:global(.identity-close:focus-visible),:global(.identity-cancel:focus-visible) { outline: 1px solid var(--accent); outline-offset: 2px; }
  @media(max-width: 760px) { :global(.identity-sheet) { width: 100%; border-radius: 12px 12px 0 0; padding-bottom: max(18px, env(safe-area-inset-bottom)); } }
  @media(pointer: coarse) { button,:global(.identity-trigger),:global(.identity-close),:global(.identity-cancel),input[type='color'] { min-width: 44px; min-height: 44px; } input:not([type='color']),textarea { min-height: 44px; font-size: 16px; } }
</style>
