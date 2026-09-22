<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { Archive, RotateCcw, Search, X } from 'lucide-svelte';

  let { projects, onRestore }: {
    projects: readonly { id: string; name: string; clientName?: string }[];
    onRestore: (id: string) => void;
  } = $props();

  let open = $state(false);
  let search = $state('');
  let notice = $state('');
  let searchInput = $state<HTMLInputElement>();
  const visible = $derived.by(() => {
    const query = search.trim().toLocaleLowerCase();
    return projects.filter(project => !query || [project.name, project.clientName ?? ''].some(value => value.toLocaleLowerCase().includes(query)));
  });

  function setOpen(next: boolean) {
    open = next;
    search = '';
    notice = '';
  }
  function restore(id: string) {
    const project = projects.find(item => item.id === id);
    if (!project) return;
    if (projects.length === 1) setOpen(false);
    onRestore(id);
    notice = `${project.name} restored.`;
    if (open) searchInput?.focus();
  }
</script>

{#if projects.length > 0}
  <Dialog.Root {open} onOpenChange={setOpen}>
    <Dialog.Trigger class="nav-item archived-trigger" aria-label={`Archived projects ${projects.length}`}>
      <Archive size={15}/><span class="archived-trigger-label">Archived projects</span><span class="archived-count">{projects.length}</span>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay class="dialog-overlay"/>
      <Dialog.Content class="filter-sheet archived-sheet">
        <div class="archived-heading"><Dialog.Title class="dialog-title">Archived projects</Dialog.Title><Dialog.Close class="archived-close" aria-label="Close archived projects"><X size={17}/></Dialog.Close></div>
        <Dialog.Description class="archived-description">Restore a project to return it to your workspace. Changes are stored in this tab.</Dialog.Description>
        <label class="archived-search"><Search size={14}/><input bind:this={searchInput} type="search" bind:value={search} placeholder="Search projects" aria-label="Search archived projects"/></label>
        <div class="archived-results">
          {#each visible as project (project.id)}
            <div class="archived-project">
              <div class="archived-identity"><span title={project.name}>{project.name}</span>{#if project.clientName}<small title={project.clientName}>{project.clientName}</small>{/if}</div>
              <button type="button" aria-label={`Restore ${project.name}`} onclick={() => restore(project.id)}><RotateCcw size={13}/>Restore</button>
            </div>
          {:else}
            <div class="archived-empty"><Archive size={24}/><p>No matching projects.</p><button type="button" onclick={() => search = ''}>Clear search</button></div>
          {/each}
        </div>
        <p class="archived-result-count" role="status">{notice || `${visible.length} ${visible.length === 1 ? 'project' : 'projects'} shown`}</p>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
{/if}

<style>
  :global(.archived-trigger) { width: 100%; }
  :global(.archived-trigger-label) { min-width: 0; white-space: nowrap; }
  :global(.archived-count) { font-variant-numeric: tabular-nums; }
  :global(.archived-sheet) { display: flex; flex-direction: column; width: min(440px, calc(100vw - 28px)); max-height: min(640px, 90svh); padding: 18px; overflow: hidden; border-color: var(--border); border-radius: 10px; background: linear-gradient(155deg, var(--raised), var(--panel) 35%); box-shadow: inset 0 1px #d3eee609, 0 16px 50px #0006; }
  .archived-heading { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 12px; }
  :global(.archived-sheet .dialog-title) { margin: 0; font-size: 15px; font-weight: 550; }
  :global(.archived-sheet .archived-description) { margin: 5px 0 14px; color: var(--muted); font-size: 11px; line-height: 1.5; }
  button,:global(.archived-close) { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; gap: 5px; min-height: 28px; padding: 0 8px; border: 1px solid var(--border); border-radius: 5px; background: var(--panel); color: var(--ink); font: inherit; font-size: 11px; cursor: pointer; }
  button:hover,:global(.archived-close:hover) { background: var(--raised); }
  :global(.archived-close) { width: 28px; padding: 0; border: 0; background: transparent; color: var(--muted); }
  .archived-search { display: flex; flex-shrink: 0; align-items: center; gap: 6px; min-height: 28px; padding: 0 8px; border: 1px solid var(--border); border-radius: 5px; background: var(--canvas); color: var(--muted); }
  input { width: 100%; min-width: 0; padding: 5px 0; background: transparent; border: 0; color: var(--ink); font: inherit; font-size: 11px; outline: none; }
  .archived-search:focus-within { outline: 1px solid var(--accent); outline-offset: 2px; }
  .archived-results { min-height: 0; margin-top: 10px; overflow-y: auto; overscroll-behavior: contain; }
  .archived-project { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .archived-identity { display: grid; min-width: 0; gap: 4px; }
  .archived-identity span,.archived-identity small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .archived-identity span { color: var(--ink); font-size: 12px; }
  .archived-identity small { color: var(--muted); font-size: 10px; }
  .archived-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 150px; gap: 10px; color: var(--muted); }
  .archived-empty p { margin: 0; font-size: 12px; }
  .archived-result-count { flex-shrink: 0; margin: 12px 0 0; color: var(--muted); font-size: 10px; overflow-wrap: anywhere; }
  button:focus-visible,:global(.archived-close:focus-visible),:global(.archived-trigger:focus-visible) { outline: 1px solid var(--accent); outline-offset: 2px; }
  @media(max-width: 760px) { :global(.archived-sheet) { width: 100%; max-height: 90svh; border-radius: 12px 12px 0 0; padding-bottom: max(18px, env(safe-area-inset-bottom)); } }
  @media(pointer: coarse) { button,:global(.archived-close),:global(.archived-trigger) { min-width: 44px; min-height: 44px; } .archived-search { min-height: 44px; } input { font-size: 16px; } }
</style>
