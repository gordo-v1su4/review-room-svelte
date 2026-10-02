<script lang="ts">
  import { Dialog, DropdownMenu } from 'bits-ui';
  import { Trash2, Ellipsis } from 'lucide-svelte';
  let { assets, canDelete = false, onDelete }: {
    assets: readonly { id: string; title: string }[];
    canDelete?: boolean;
    onDelete: (ids: string[]) => Promise<void>;
  } = $props();
  let open = $state(false), busy = $state(false), failure = $state('');
  let targets = $state<{ id: string; title: string }[]>([]);
  function requestDelete() {
    if (!canDelete || !assets.length) return;
    targets = assets.map(({ id, title }) => ({ id, title }));
    failure = ''; open = true;
  }
  async function confirmDelete() {
    if (!canDelete || busy || !targets.length) return;
    busy = true; failure = '';
    try { await onDelete(targets.map(asset => asset.id)); open = false; }
    catch (cause) { failure = cause instanceof Error ? cause.message : 'Could not delete clips. Try again.'; }
    finally { busy = false; }
  }
</script>

{#if canDelete}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger title="Selected clip actions" aria-label="Actions" disabled={!assets.length}><Ellipsis size={16}/><span class="selection-label">Actions</span></DropdownMenu.Trigger>
    <DropdownMenu.Portal><DropdownMenu.Content class="delete-menu" sideOffset={6}>
      <DropdownMenu.Item class="delete-item" onSelect={requestDelete}><Trash2 size={14}/> Delete selected</DropdownMenu.Item>
    </DropdownMenu.Content></DropdownMenu.Portal>
  </DropdownMenu.Root>
  <Dialog.Root {open} onOpenChange={value => { if (!busy) open = value; }}>
    <Dialog.Portal><Dialog.Overlay class="delete-overlay"/><Dialog.Content class="delete-dialog">
      <Dialog.Title>Delete selected clips?</Dialog.Title>
      <Dialog.Description>Permanently delete {targets.length} selected {targets.length === 1 ? 'clip' : 'clips'}, including versions and feedback. Published links to these clips will stop working. This cannot be undone. Use Archive to keep them instead.</Dialog.Description>
      <ul>{#each targets as asset (asset.id)}<li>{asset.title}</li>{/each}</ul>
      {#if failure}<p role="alert">{failure}</p>{/if}
      <div class="delete-buttons"><button type="button" disabled={busy} onclick={() => open = false}>Cancel</button><button class="delete-confirm" type="button" disabled={busy} onclick={confirmDelete}>{busy ? 'Deleting…' : 'Delete permanently'}</button></div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
{/if}

<style>
  :global(.delete-menu) { z-index:80; padding:5px; border:1px solid var(--border); border-radius:7px; background:var(--raised,#171c1d); }
  :global(.delete-item) { display:flex; align-items:center; gap:8px; padding:9px 12px; color:var(--status-needs-changes,#f87171); font-size:12px; cursor:pointer; border-radius:4px; }
  :global(.delete-item[data-highlighted]) { background:#ffffff0c; outline:none; }
  :global(.delete-overlay) { position:fixed; inset:0; z-index:90; background:#0009; }
  :global(.delete-dialog) { position:fixed; z-index:91; top:50%; left:50%; transform:translate(-50%,-50%); width:min(440px,calc(100vw - 32px)); max-height:calc(100svh - 32px); overflow:auto; padding:24px; border:1px solid var(--border); border-radius:10px; background:var(--raised,#171c1d); color:var(--ink,#e6eceb); }
  :global(.delete-dialog h2) { margin:0 0 12px; font-size:18px; }
  :global(.delete-dialog p) { font-size:12px; line-height:1.6; color:var(--muted); }
  ul { max-height:150px; overflow:auto; padding-left:18px; font-size:12px; line-height:1.8; }
  .delete-buttons { display:flex; justify-content:flex-end; gap:9px; margin-top:20px; }
  .delete-buttons button { min-height:36px; padding:8px 12px; border:1px solid var(--border); border-radius:6px; background:#ffffff08; color:inherit; font-size:12px; cursor:pointer; }
  .delete-buttons .delete-confirm { background:#9f2929; border-color:#ae3636; color:white; }
  button:disabled { opacity:.5; cursor:default; }
</style>
