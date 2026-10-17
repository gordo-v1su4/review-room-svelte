<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { X } from 'lucide-svelte';
  import Stage1Select from './Stage1Select.svelte';

  const NEW_FOLDER = '__new__';
  const ROOT = '__root__';
  let { open = $bindable(false), count, folders, onCopy }: {
    open?: boolean;
    /** How many assets (or the one chosen version) will be copied. */
    count: number;
    /** Ordinary folders only: locked folders never receive copies. */
    folders: readonly { id: string; title: string }[];
    onCopy: (target: { folderId: string | null; newFolderTitle?: string }) => Promise<void>;
  } = $props();
  let destination = $state(NEW_FOLDER);
  let name = $state('');
  let busy = $state(false);
  let error = $state('');
  $effect(() => { if (open) { destination = NEW_FOLDER; name = ''; error = ''; } });
  const items = $derived([{ value: NEW_FOLDER, label: 'New folder…' }, { value: ROOT, label: 'Project root' }, ...folders.map(folder => ({ value: folder.id, label: folder.title }))]);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (destination === NEW_FOLDER && !name.trim()) { error = 'Enter a folder name.'; return; }
    busy = true; error = '';
    try {
      await onCopy(destination === NEW_FOLDER ? { folderId: null, newFolderTitle: name.trim() } : { folderId: destination === ROOT ? null : destination });
      open = false;
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Could not copy.'; }
    finally { busy = false; }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="folder-overlay"/>
    <Dialog.Content class="folder-dialog">
      <div class="copy-heading"><Dialog.Title class="folder-dialog-title">Copy to folder</Dialog.Title><Dialog.Close class="folder-close" aria-label="Close"><X size={17}/></Dialog.Close></div>
      <Dialog.Description class="folder-description">Copy {count === 1 ? 'this asset' : `${count} assets`} into an ordinary folder, for example to submit to Trailer Feed. Copies keep their code and metadata and share the stored file; changing or deleting a copy never touches the original.</Dialog.Description>
      <form onsubmit={submit} aria-busy={busy}>
        <div class="copy-field"><span>Destination</span><Stage1Select label="Destination" {items} bind:value={destination} disabled={busy}/></div>
        {#if destination === NEW_FOLDER}<label class="copy-field">Folder name<input bind:value={name} placeholder="Trailer Feed submission" maxlength="120" disabled={busy}/></label>{/if}
        {#if error}<p class="copy-error" role="alert">{error}</p>{/if}
        <div class="copy-actions"><Dialog.Close class="folder-cancel" type="button">Cancel</Dialog.Close><button type="submit" class="copy-submit" disabled={busy || (destination === NEW_FOLDER && !name.trim())}>{busy ? 'Copying…' : 'Copy'}</button></div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .copy-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .copy-field { display: grid; gap: 7px; margin-top: 10px; font-size: 11px; color: var(--muted); }
  .copy-field input { width: 100%; min-width: 0; height: 34px; padding: 0 9px; color: var(--ink); background: var(--canvas); border: 1px solid var(--border); border-radius: 5px; font: inherit; font-size: 12px; }
  .copy-field input:focus-visible { outline: 1px solid var(--accent, #62b9aa); outline-offset: 2px; }
  .copy-error { color: #e6a2a2; font-size: 12px; margin: 12px 0 0; }
  .copy-actions { display: flex; justify-content: end; gap: 7px; margin-top: 20px; }
  .copy-submit { min-height: 32px; padding: 0 12px; border: 1px solid transparent; border-radius: 5px; background: color-mix(in srgb, var(--accent, #62b9aa) 22%, var(--panel)); color: var(--ink); font: inherit; font-size: 11px; cursor: pointer; }
  .copy-submit:disabled { opacity: .4; cursor: default; }
  .copy-submit:focus-visible { outline: 1px solid var(--accent, #62b9aa); outline-offset: 2px; }
</style>
