<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { X } from 'lucide-svelte';
  import Stage1Select from './Stage1Select.svelte';

  type Option = { value: string; label: string };
  let { open = $bindable(false), assetName, filename, shots, folders, onFileAsTake, onMove }: {
    open?: boolean;
    assetName: string;
    filename: string;
    /** Shots in this folder that the file can join as the next version. */
    shots: Option[];
    /** Other folders in the project; locked scene folders match the filename's code again. */
    folders: Option[];
    onFileAsTake: (shotId: string) => Promise<void>;
    onMove: (folderId: string | null) => Promise<void>;
  } = $props();
  let shotId = $state('');
  let folderId = $state('');
  let busy = $state(false);
  let error = $state('');
  $effect(() => { if (open) { shotId = shots[0]?.value ?? ''; folderId = ''; error = ''; } });
  async function run(action: () => Promise<void>) {
    busy = true; error = '';
    try { await action(); open = false; }
    catch (cause) { error = cause instanceof Error ? cause.message : 'Could not file this item.'; }
    finally { busy = false; }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="folder-overlay"/>
    <Dialog.Content class="folder-dialog">
      <div class="misfiled-heading"><Dialog.Title class="folder-dialog-title">File misfiled item</Dialog.Title><Dialog.Close class="folder-close" aria-label="Close"><X size={17}/></Dialog.Close></div>
      <Dialog.Description class="folder-description">“{filename}” ({assetName}) has no shot code that matches this folder. File it as a take, or move it to the right scene folder.</Dialog.Description>
      <section>
        <h3>It belongs here</h3>
        {#if shots.length}
          <div class="misfiled-row"><Stage1Select label="Shot" items={shots} bind:value={shotId} disabled={busy}/><button type="button" class="misfiled-action primary" disabled={busy || !shotId} onclick={() => run(() => onFileAsTake(shotId))}>Add as next version</button></div>
        {:else}<p class="misfiled-note">No shots in this folder yet.</p>{/if}
      </section>
      <section>
        <h3>It belongs elsewhere</h3>
        <div class="misfiled-row"><Stage1Select label="Folder" placeholder="Choose a folder" items={folders} bind:value={folderId} disabled={busy}/><button type="button" class="misfiled-action" disabled={busy || !folderId} onclick={() => run(() => onMove(folderId === '__root__' ? null : folderId))}>Move</button></div>
        <p class="misfiled-note">In a scene folder whose shot matches the filename, it becomes that shot's next version.</p>
      </section>
      {#if error}<p class="folder-error" role="alert">{error}</p>{/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .misfiled-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  section + section { margin-top: 16px; }
  h3 { margin: 0 0 7px; color: var(--muted); font-size: 10px; font-weight: 650; letter-spacing: .1em; text-transform: uppercase; }
  .misfiled-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; align-items: center; }
  .misfiled-note { margin: 6px 0 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
  .folder-error { color: #e6a2a2; font-size: 12px; margin: 12px 0 0; }
  /* Same size as the folder dialog actions. */
  .misfiled-action { min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 5px; background: var(--raised); color: var(--ink); font: inherit; font-size: 11px; white-space: nowrap; cursor: pointer; }
  .misfiled-action.primary { border-color: transparent; background: color-mix(in srgb, var(--accent, #62b9aa) 22%, var(--panel)); }
  .misfiled-action:disabled { opacity: .4; cursor: default; }
  .misfiled-action:focus-visible { outline: 1px solid var(--accent, #62b9aa); outline-offset: 2px; }
</style>
