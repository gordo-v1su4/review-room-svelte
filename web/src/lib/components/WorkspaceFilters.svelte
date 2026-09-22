<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { SlidersHorizontal, X, Check } from 'lucide-svelte';
  import type { VideoStatus } from '../../../../src/lib/types';
  import type { WorkspaceAssetClass, WorkspaceFilterState, WorkspaceSort } from '$lib/workspace';
  export type WorkspaceFilterValues = WorkspaceFilterState;
  let { value, onChange, filter = 'all', mediaType = 'all', minRating = 0, sort }: { value?: WorkspaceFilterState; onChange: (values: WorkspaceFilterState) => void; filter?: 'all' | 'selected' | VideoStatus; mediaType?: 'all' | 'video' | 'image'; minRating?: number; sort?: WorkspaceSort } = $props();
  let open = $state(false);
  let draft = $state<WorkspaceFilterState>({ search: '', tags: [], statuses: [], assetClasses: [], selectedOnly: false, minRating: 0, hasComments: false, sort: 'newest', groupBy: 'none' });
  const statuses: readonly { value: VideoStatus; label: string }[] = [
    { value: 'not_started', label: 'Not started' }, { value: 'in_progress', label: 'In progress' }, { value: 'awaiting_review', label: 'Awaiting review' }, { value: 'needs_changes', label: 'Needs changes' }, { value: 'approved', label: 'Approved' }, { value: 'final', label: 'Final' }, { value: 'omitted', label: 'Omitted' }, { value: 'archived', label: 'Archived' },
  ];
  const classes: readonly { value: WorkspaceAssetClass; label: string }[] = [{ value: 'VID', label: 'Video' }, { value: 'IMG', label: 'Image' }, { value: 'CTX', label: 'Contact sheet' }, { value: 'STB', label: 'Storyboard' }];
  function legacyValue(): WorkspaceFilterState { return { search: '', tags: [], statuses: filter !== 'all' && filter !== 'selected' ? [filter] : [], assetClasses: mediaType === 'all' ? [] : [mediaType === 'video' ? 'VID' : 'IMG'], selectedOnly: filter === 'selected', minRating, hasComments: false, sort: sort ?? 'newest', groupBy: 'none' }; }
  function appliedValue(): WorkspaceFilterState { return value ?? legacyValue(); }
  function openFilters() { draft = { ...appliedValue(), statuses: [...appliedValue().statuses], assetClasses: [...appliedValue().assetClasses], tags: [...appliedValue().tags] }; open = true; }
  function toggleStatus(status: VideoStatus) { draft = { ...draft, statuses: draft.statuses.includes(status) ? draft.statuses.filter(item => item !== status) : [...draft.statuses, status] }; }
  function toggleClass(assetClass: WorkspaceAssetClass) { draft = { ...draft, assetClasses: draft.assetClasses.includes(assetClass) ? draft.assetClasses.filter(item => item !== assetClass) : [...draft.assetClasses, assetClass] }; }
  function clear() { draft = { search: '', tags: [], statuses: [], assetClasses: [], selectedOnly: false, minRating: 0, hasComments: false, sort: 'newest', groupBy: 'none' }; }
  function apply() { onChange({ ...draft }); open = false; }
  function activeCount() { const applied = appliedValue(); return applied.statuses.length + applied.assetClasses.length + Number(applied.selectedOnly) + Number(applied.hasComments) + Number(applied.minRating > 0) + Number(applied.sort !== 'newest') + Number(applied.groupBy !== 'none') + Number(applied.tags.length > 0); }
</script>
<Dialog.Root bind:open>
  <Dialog.Trigger class="secondary-button" onclick={openFilters}><SlidersHorizontal size={16} /> Filters{#if activeCount()} · {activeCount()}{/if}</Dialog.Trigger>
  <Dialog.Portal><Dialog.Overlay class="dialog-overlay" /><Dialog.Content class="filter-sheet" aria-label="Workspace filters">
    <div class="sheet-heading"><Dialog.Title>Filter media</Dialog.Title><Dialog.Close class="icon-button" aria-label="Close filters"><X size={18} /></Dialog.Close></div>
    <Dialog.Description>Focus on the next decision.</Dialog.Description>
    <div class="filter-section"><span class="filter-label">Status</span><div class="filter-grid">{#each statuses as option (option.value)}<button aria-pressed={draft.statuses.includes(option.value)} class:chosen={draft.statuses.includes(option.value)} class="filter-option" type="button" onclick={() => toggleStatus(option.value)}>{option.label}{#if draft.statuses.includes(option.value)}<Check size={15} />{/if}</button>{/each}</div></div>
    <div class="filter-section"><span class="filter-label">Media class</span><div class="filter-grid class-grid">{#each classes as option (option.value)}<button aria-pressed={draft.assetClasses.includes(option.value)} class:chosen={draft.assetClasses.includes(option.value)} class="filter-option" type="button" onclick={() => toggleClass(option.value)}>{option.label}{#if draft.assetClasses.includes(option.value)}<Check size={15} />{/if}</button>{/each}</div></div>
    <label class="filter-field">Tags<input aria-label="Filter by tags" placeholder="tag, tag…" value={draft.tags.join(', ')} oninput={(event) => { draft = { ...draft, tags: event.currentTarget.value.split(',').map(tag => tag.trim()).filter(Boolean) }; }} /></label>
    <label class="filter-field">Minimum rating<select bind:value={draft.minRating}>{#each [0,1,2,3,4,5] as rating (rating)}<option value={rating}>{rating ? `${rating}+ stars` : 'Any rating'}</option>{/each}</select></label>
    <label class="filter-field">Sort by<select bind:value={draft.sort}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="comments">Most comments</option><option value="name">Name</option><option value="name-desc">Name (Z–A)</option><option value="status">Status</option><option value="rating">Rating</option></select></label>
    <label class="filter-field">Group by<select bind:value={draft.groupBy}><option value="none">No grouping</option><option value="status">Status</option><option value="class">Media class</option><option value="folder">Folder</option></select></label>
    <label class="filter-check"><input type="checkbox" bind:checked={draft.selectedOnly} /> Shortlist only</label><label class="filter-check"><input type="checkbox" bind:checked={draft.hasComments} /> Has comments</label>
    <div class="filter-actions"><button type="button" class="secondary-button" onclick={clear}>Clear</button><button type="button" class="primary-button" onclick={apply}><Check size={16} /> Apply</button></div>
  </Dialog.Content></Dialog.Portal>
</Dialog.Root>

<style>
  .filter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; margin-top: 5px; }
  .class-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .filter-option { min-height: 30px; padding: 0 7px; font-size: 11px; }
  .filter-section { margin-top: 12px; }
  .filter-label { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
</style>
