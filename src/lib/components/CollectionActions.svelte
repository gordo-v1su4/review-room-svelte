<script lang="ts">
  import { Dialog, DropdownMenu } from 'bits-ui';
  import { Layers, MoreHorizontal, Pencil, Save, Trash2, X } from 'lucide-svelte';

  let { activeCollection, folders, canEdit = false, onCreate, onRename, onRemove, onSave }: {
    activeCollection?: { id: string; title: string; sourceFolderId?: string };
    folders: readonly { id: string; title: string }[];
    canEdit?: boolean;
    onCreate: (title: string) => void;
    onRename: (id: string, title: string) => void;
    onRemove: (id: string) => void;
    onSave: (id: string, sourceFolderId: string | undefined) => void;
  } = $props();
  type Operation = 'create' | 'rename' | 'remove' | 'save';
  let open = $state(false);
  let menuOpen = $state(false);
  let operation = $state<Operation>('create');
  let collectionId = $state<string>();
  let collectionTitle = $state('');
  let name = $state('');
  let sourceFolderId = $state('');
  let error = $state('');
  let menuTrigger = $state<HTMLButtonElement | null>(null);
  let newTrigger = $state<HTMLButtonElement>();
  let returnFocus: HTMLElement | undefined;
  let title = $derived(operation === 'create' ? 'New collection' : operation === 'rename' ? 'Rename collection' : operation === 'remove' ? 'Delete collection' : 'Save collection rules');

  function begin(next: Operation) {
    if (!canEdit || (next !== 'create' && !activeCollection)) return;
    returnFocus = next === 'create' ? newTrigger : menuTrigger ?? undefined;
    operation = next;
    collectionId = next === 'create' ? undefined : activeCollection?.id;
    collectionTitle = activeCollection?.title ?? '';
    name = next === 'rename' ? collectionTitle : '';
    sourceFolderId = activeCollection?.sourceFolderId ?? '';
    error = ''; menuOpen = false; open = true;
  }
  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!canEdit) { error = 'Collection editing is unavailable.'; return; }
    error = '';
    try {
      if (operation === 'create' || operation === 'rename') {
        const value = name.trim();
        if (!value) throw new Error('Enter a collection name.');
        if (operation === 'create') onCreate(value);
        else if (collectionId) onRename(collectionId, value);
        else throw new Error('This collection is no longer available.');
      } else {
        if (!collectionId) throw new Error('This collection is no longer available.');
        if (operation === 'remove') onRemove(collectionId);
        else {
          if (sourceFolderId && !folders.some(folder => folder.id === sourceFolderId)) throw new Error('Choose an available source folder.');
          onSave(collectionId, sourceFolderId || undefined);
        }
      }
      open = false;
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Could not update the collection.'; }
  }
</script>

{#if canEdit}
  <div class="collection-actions">
    <button type="button" class="collection-button explorer-tool" aria-label="New collection" title="New collection" bind:this={newTrigger} onclick={() => begin('create')}><Layers size={14}/><span class="explorer-tool-label">New collection</span></button>
    {#if activeCollection}
      <DropdownMenu.Root bind:open={menuOpen}>
        <DropdownMenu.Trigger bind:ref={menuTrigger} class="collection-button collection-menu-trigger" aria-label={`Collection settings for ${activeCollection.title}`} title="Collection settings"><MoreHorizontal size={16}/></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content class="collection-menu" sideOffset={6} align="end" onCloseAutoFocus={event => { if (open) event.preventDefault(); }}>
          <DropdownMenu.Item class="collection-menu-item" onSelect={() => begin('rename')}><Pencil size={13}/>Rename collection</DropdownMenu.Item>
          <DropdownMenu.Item class="collection-menu-item" onSelect={() => begin('save')}><Save size={13}/>Save collection rules</DropdownMenu.Item>
          <DropdownMenu.Item class="collection-menu-item destructive" onSelect={() => begin('remove')}><Trash2 size={13}/>Delete collection</DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>
    {/if}
  </div>
{/if}

<Dialog.Root bind:open>
  <Dialog.Portal><Dialog.Overlay class="collection-overlay"/>
    <Dialog.Content class="collection-dialog" onCloseAutoFocus={event => { event.preventDefault(); const target = returnFocus?.isConnected ? returnFocus : newTrigger; target?.focus(); }}>
      <div class="dialog-heading"><Dialog.Title class="collection-dialog-title">{title}</Dialog.Title><Dialog.Close class="collection-close" aria-label="Close collection dialog"><X size={17}/></Dialog.Close></div>
      <Dialog.Description class="collection-description">{#if operation === 'create'}Save a view of your media as a collection.{:else if operation === 'rename'}Update the name of “{collectionTitle}”.{:else if operation === 'remove'}Delete “{collectionTitle}”? Only the collection is removed. Your media stays where it is.{:else}Replace the rules for “{collectionTitle}” with the current explorer filters. Choose the media these rules search below.{/if}</Dialog.Description>
      <form onsubmit={submit}>
        {#if operation === 'create' || operation === 'rename'}<label class="collection-field">Collection name<input aria-label="Collection name" bind:value={name} placeholder="Collection name" maxlength="100" required/></label>
        {:else if operation === 'save'}<label class="collection-field">Source folder<select aria-label="Collection source folder" bind:value={sourceFolderId}><option value="">All project media</option>{#each folders as folder (folder.id)}<option value={folder.id}>{folder.title}</option>{/each}</select></label>{/if}
        <p class="session-note">Stored in this tab only.</p>
        {#if error}<p class="collection-error" role="alert">{error}</p>{/if}
        <div class="dialog-actions"><Dialog.Close class="collection-cancel" type="button">Cancel</Dialog.Close><button type="submit" class="collection-submit" class:danger={operation === 'remove'} disabled={!canEdit || ((operation === 'create' || operation === 'rename') && !name.trim())}>{operation === 'create' ? 'Create collection' : operation === 'rename' ? 'Save name' : operation === 'remove' ? 'Delete collection' : 'Save rules'}</button></div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .collection-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
  :global(.collection-button) { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 9px; border: 1px solid var(--border); border-radius: 5px; background: var(--panel); color: var(--ink); font: inherit; font-size: 11px; white-space: nowrap; cursor: pointer; }
  :global(.collection-menu-trigger) { width: 30px; padding: 0; }
  :global(.collection-button:hover) { background: var(--raised); }
  :global(.collection-menu) { z-index: 80; min-width: 190px; padding: 4px; border: 1px solid var(--border); border-radius: 7px; background: var(--panel); box-shadow: 0 10px 36px #0006; }
  :global(.collection-menu-item) { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 8px; color: var(--ink); font-size: 11px; border-radius: 4px; cursor: pointer; outline: none; }
  :global(.collection-menu-item[data-highlighted]) { background: var(--raised); }
  :global(.collection-menu-item.destructive) { color: #d79d9d; }
  :global(.collection-overlay) { position: fixed; inset: 0; z-index: 100; background: #0009; }
  :global(.collection-dialog) { position: fixed; top: 50%; left: 50%; z-index: 101; transform: translate(-50%, -50%); width: min(420px, calc(100vw - 28px)); max-height: calc(100dvh - 40px); overflow-y: auto; padding: 18px; border: 1px solid var(--border); border-radius: 10px; background: var(--panel); color: var(--ink); box-shadow: 0 24px 90px #0008; outline: none; }
  .dialog-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  :global(.collection-dialog-title) { margin: 0; font-size: 15px; font-weight: 550; }
  :global(.collection-close) { display: grid; place-items: center; width: 28px; height: 28px; background: transparent; border: 0; border-radius: 4px; color: var(--muted); cursor: pointer; }
  :global(.collection-description) { display: block; margin: 8px 0 18px; font-size: 12px; line-height: 1.6; color: var(--muted); }
  .collection-field { display: grid; gap: 7px; font-size: 11px; color: var(--muted); }
  .collection-field input,.collection-field select { width: 100%; min-width: 0; height: 34px; padding: 0 9px; color: var(--ink); background: var(--canvas); border: 1px solid var(--border); border-radius: 5px; font: inherit; font-size: 12px; }
  .session-note { color: var(--muted); margin: 10px 0 0; font-size: 10px; }
  .collection-error { color: #e6a2a2; font-size: 12px; line-height: 1.5; margin: 12px 0 0; }
  .dialog-actions { display: flex; justify-content: end; gap: 7px; margin-top: 20px; }
  :global(.collection-cancel),.collection-submit { min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 5px; font: inherit; font-size: 11px; cursor: pointer; background: var(--raised); color: var(--ink); }
  .collection-submit { border-color: transparent; background: color-mix(in srgb, var(--accent, #62b9aa) 22%, var(--panel)); }
  .collection-submit.danger { color: #ecc2c2; background: #592f32; }
  .collection-submit:disabled { opacity: .4; cursor: default; }
  :global(.collection-button:focus-visible),:global(.collection-close:focus-visible),:global(.collection-cancel:focus-visible),.collection-submit:focus-visible,.collection-field input:focus-visible,.collection-field select:focus-visible { outline: 1px solid var(--accent, #62b9aa); outline-offset: 2px; }
  @media(pointer: coarse) { :global(.collection-button),:global(.collection-menu-item),:global(.collection-close),:global(.collection-cancel),.collection-submit { min-height: 44px; } :global(.collection-menu-trigger),:global(.collection-close) { min-width: 44px; } .collection-field input,.collection-field select { height: 44px; font-size: 16px; } }
</style>
