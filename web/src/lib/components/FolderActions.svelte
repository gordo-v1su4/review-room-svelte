<script lang="ts">
  import { Dialog, DropdownMenu } from 'bits-ui';
  import { FolderInput, FolderPlus, MoreHorizontal, Pencil, Trash2, X } from 'lucide-svelte';

  let { folders, activeFolderId, canManage = false, selectedCount = 0, onCreate, onRename, onRemove, onMove }: {
    folders: readonly { id: string; title: string }[];
    activeFolderId: string | null;
    canManage?: boolean;
    selectedCount?: number;
    onCreate: (title: string) => void;
    onRename: (folderId: string, title: string) => void;
    onRemove: (folderId: string, disposition: 'move_to_root' | 'archive_assets') => void;
    onMove: (folderId: string | null) => void;
  } = $props();
  type Operation = 'create' | 'rename' | 'remove' | 'move';
  let open = $state(false);
  let menuOpen = $state(false);
  let operation = $state<Operation>('create');
  let folderId = $state<string | null>(null);
  let folderTitle = $state('');
  let name = $state('');
  let destination = $state('');
  let disposition = $state<'move_to_root' | 'archive_assets'>('move_to_root');
  let error = $state('');
  let returnFocus: HTMLElement | undefined;
  let activeFolder = $derived(folders.find(folder => folder.id === activeFolderId));
  let title = $derived(operation === 'create' ? 'New folder' : operation === 'rename' ? 'Rename folder' : operation === 'remove' ? 'Delete folder' : `Move ${selectedCount} ${selectedCount === 1 ? 'asset' : 'assets'}`);

  function begin(next: Operation, trigger?: HTMLElement) {
    if (!canManage || ((next === 'rename' || next === 'remove') && !activeFolder)) return;
    if (trigger) returnFocus = trigger;
    operation = next;
    folderId = activeFolder?.id ?? null;
    folderTitle = activeFolder?.title ?? '';
    name = next === 'rename' ? folderTitle : '';
    destination = ''; disposition = 'move_to_root'; error = ''; menuOpen = false; open = true;
  }
  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!canManage) { error = 'Folder management is unavailable.'; return; }
    error = '';
    try {
      if (operation === 'create' || operation === 'rename') {
        const value = name.trim();
        if (!value) { error = 'Enter a folder name.'; return; }
        if (operation === 'create') onCreate(value);
        else if (folderId) onRename(folderId, value);
        else throw new Error('This folder is no longer available.');
      } else if (operation === 'remove') {
        if (!folderId) throw new Error('This folder is no longer available.');
        onRemove(folderId, disposition);
      } else {
        if (!selectedCount) throw new Error('Select at least one asset to move.');
        onMove(destination || null);
      }
      open = false;
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Could not update the folder.'; }
  }
</script>

{#if canManage}
  <div class="folder-actions">
    <button type="button" class="folder-button" onclick={event => begin('create', event.currentTarget)}><FolderPlus size={14}/>New folder</button>
    {#if selectedCount > 0}<button type="button" class="folder-button" onclick={event => begin('move', event.currentTarget)}><FolderInput size={14}/>Move {selectedCount}</button>{/if}
    {#if activeFolder}
      <DropdownMenu.Root bind:open={menuOpen}>
        <DropdownMenu.Trigger class="folder-button folder-menu-trigger" aria-label={`Folder settings for ${activeFolder.title}`} title="Folder settings" onclick={event => returnFocus = event.currentTarget}><MoreHorizontal size={16}/></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content class="folder-menu" sideOffset={6} align="end" onCloseAutoFocus={event => { if (open) event.preventDefault(); }}>
          <DropdownMenu.Item class="folder-menu-item" onSelect={() => begin('rename')}><Pencil size={13}/>Rename folder</DropdownMenu.Item>
          <DropdownMenu.Item class="folder-menu-item destructive" onSelect={() => begin('remove')}><Trash2 size={13}/>Delete folder</DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>
    {/if}
  </div>
{/if}

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="folder-overlay"/>
    <Dialog.Content class="folder-dialog" onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus?.isConnected) returnFocus.focus(); }}>
      <div class="dialog-heading"><Dialog.Title class="folder-dialog-title">{title}</Dialog.Title><Dialog.Close class="folder-close" aria-label="Close folder dialog"><X size={17}/></Dialog.Close></div>
      <Dialog.Description class="folder-description">{#if operation === 'create'}Create a folder in this project for the current session.{:else if operation === 'rename'}Update “{folderTitle}” in this session.{:else if operation === 'remove'}Choose what happens to the assets in “{folderTitle}”. This changes the current session only.{:else}Choose a destination in this project. Your media files stay on this device.{/if}</Dialog.Description>
      <form onsubmit={submit}>
        {#if operation === 'create' || operation === 'rename'}
          <label class="folder-field">Folder name<input aria-label="Folder name" bind:value={name} placeholder="Folder name" maxlength="100" required/></label>
        {:else if operation === 'move'}
          <label class="folder-field">Destination<select aria-label="Folder destination" bind:value={destination}><option value="">Project root</option>{#each folders as folder (folder.id)}<option value={folder.id}>{folder.title}</option>{/each}</select></label>
        {:else}
          <fieldset class="disposition"><legend>Assets in this folder</legend><label><input type="radio" bind:group={disposition} value="move_to_root"/><span>Move to project root<small>Keep the assets available outside this folder.</small></span></label><label><input type="radio" bind:group={disposition} value="archive_assets"/><span>Archive assets<small>Hide these assets from active views in this session.</small></span></label></fieldset>
        {/if}
        {#if error}<p class="folder-error" role="alert">{error}</p>{/if}
        <div class="dialog-actions"><Dialog.Close class="folder-cancel" type="button">Cancel</Dialog.Close><button type="submit" class="folder-submit" class:danger={operation === 'remove'} disabled={!canManage || ((operation === 'create' || operation === 'rename') && !name.trim()) || (operation === 'move' && selectedCount === 0)}>{operation === 'create' ? 'Create folder' : operation === 'rename' ? 'Save name' : operation === 'remove' ? 'Delete folder' : 'Move assets'}</button></div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .folder-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
  :global(.folder-button) { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 9px; border: 1px solid var(--border); border-radius: 5px; background: var(--panel); color: var(--ink); font: inherit; font-size: 11px; white-space: nowrap; cursor: pointer; }
  :global(.folder-menu-trigger) { width: 30px; padding: 0; }
  :global(.folder-button:hover) { background: var(--raised); }
  :global(.folder-menu) { z-index: 80; min-width: 164px; padding: 4px; border: 1px solid var(--border); border-radius: 7px; background: var(--panel); box-shadow: 0 10px 36px #0006; }
  :global(.folder-menu-item) { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 8px; color: var(--ink); font-size: 11px; border-radius: 4px; cursor: pointer; outline: none; }
  :global(.folder-menu-item[data-highlighted]) { background: var(--raised); }
  :global(.folder-menu-item.destructive) { color: #d79d9d; }
  :global(.folder-overlay) { position: fixed; inset: 0; z-index: 100; background: #0009; }
  :global(.folder-dialog) { position: fixed; top: 50%; left: 50%; z-index: 101; transform: translate(-50%, -50%); width: min(420px, calc(100vw - 28px)); max-height: calc(100dvh - 40px); overflow-y: auto; padding: 18px; border: 1px solid var(--border); border-radius: 10px; background: var(--panel); color: var(--ink); box-shadow: 0 24px 90px #0008; outline: none; }
  .dialog-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  :global(.folder-dialog-title) { margin: 0; font-size: 15px; font-weight: 550; }
  :global(.folder-close) { display: grid; place-items: center; width: 28px; height: 28px; background: transparent; border: 0; border-radius: 4px; color: var(--muted); cursor: pointer; }
  :global(.folder-description) { display: block; margin: 8px 0 18px; font-size: 12px; line-height: 1.6; color: var(--muted); }
  .folder-field { display: grid; gap: 7px; font-size: 11px; color: var(--muted); }
  .folder-field input,.folder-field select { width: 100%; min-width: 0; height: 34px; padding: 0 9px; color: var(--ink); background: var(--canvas); border: 1px solid var(--border); border-radius: 5px; font: inherit; font-size: 12px; }
  .disposition { padding: 0; margin: 0; border: 0; }
  .disposition legend { margin-bottom: 9px; font-size: 11px; color: var(--muted); }
  .disposition label { display: flex; align-items: start; gap: 9px; padding: 10px 0; font-size: 12px; cursor: pointer; }
  .disposition input { margin-top: 2px; accent-color: var(--accent, #62b9aa); }
  .disposition span { display: grid; gap: 4px; }
  .disposition small { color: var(--muted); font-size: 11px; line-height: 1.5; }
  .folder-error { color: #e6a2a2; font-size: 12px; line-height: 1.5; margin: 12px 0 0; }
  .dialog-actions { display: flex; justify-content: end; gap: 7px; margin-top: 20px; }
  :global(.folder-cancel),.folder-submit { min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 5px; font: inherit; font-size: 11px; cursor: pointer; background: var(--raised); color: var(--ink); }
  .folder-submit { border-color: transparent; background: color-mix(in srgb, var(--accent, #62b9aa) 22%, var(--panel)); }
  .folder-submit.danger { color: #ecc2c2; background: #592f32; }
  .folder-submit:disabled { opacity: .4; cursor: default; }
  :global(.folder-button:focus-visible),:global(.folder-close:focus-visible),:global(.folder-cancel:focus-visible),.folder-submit:focus-visible,.folder-field input:focus-visible,.folder-field select:focus-visible { outline: 1px solid var(--accent, #62b9aa); outline-offset: 2px; }
  @media(pointer: coarse) { :global(.folder-button),:global(.folder-menu-item),:global(.folder-close),:global(.folder-cancel),.folder-submit { min-height: 44px; } :global(.folder-menu-trigger),:global(.folder-close) { min-width: 44px; } .folder-field input,.folder-field select { height: 44px; font-size: 16px; } .disposition label { min-height: 44px; } }
</style>
