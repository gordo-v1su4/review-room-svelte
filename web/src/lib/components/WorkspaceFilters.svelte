<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { SlidersHorizontal, X, Check } from 'lucide-svelte';
  import type { VideoStatus } from '../../../../src/lib/types';

  export type WorkspaceFilterId = 'all' | 'selected' | VideoStatus;
  export type WorkspaceMediaType = 'all' | 'video' | 'image';
  export type WorkspaceSort = 'name' | 'status' | 'rating' | undefined;
  export type WorkspaceFilterValues = {
    filter: WorkspaceFilterId;
    mediaType: WorkspaceMediaType;
    minRating: number;
    sort: WorkspaceSort;
  };

  let {
    filter = 'all',
    mediaType = 'all',
    minRating = 0,
    sort,
    onChange,
  }: WorkspaceFilterValues & { onChange: (values: WorkspaceFilterValues) => void } = $props();

  let open = $state(false);
  let draft = $state<WorkspaceFilterValues>({ filter: 'all', mediaType: 'all', minRating: 0, sort: undefined });
  const statuses: readonly { value: WorkspaceFilterId; label: string }[] = [
    { value: 'all', label: 'All media' },
    { value: 'selected', label: 'Shortlisted' },
    { value: 'not_started', label: 'Not started' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'awaiting_review', label: 'Awaiting review' },
    { value: 'needs_changes', label: 'Needs changes' },
    { value: 'approved', label: 'Approved' },
    { value: 'final', label: 'Final' },
    { value: 'omitted', label: 'Omitted' },
    { value: 'archived', label: 'Archived' },
  ];

  function openFilters() {
    draft = { filter, mediaType, minRating, sort };
    open = true;
  }
  function clear() {
    draft = { filter: 'all', mediaType: 'all', minRating: 0, sort: undefined };
  }
  function apply() {
    onChange({ ...draft });
    open = false;
  }
  function activeCount() {
    return Number(filter !== 'all') + Number(mediaType !== 'all') + Number(minRating > 0) + Number(sort !== undefined);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger class="secondary-button" onclick={openFilters}>
    <SlidersHorizontal size={16} /> Filters{#if activeCount() > 0} · {activeCount()}{/if}
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="filter-sheet" aria-label="Workspace filters">
      <div class="sheet-heading">
        <Dialog.Title>Filter media</Dialog.Title>
        <Dialog.Close class="icon-button" aria-label="Close filters"><X size={18} /></Dialog.Close>
      </div>
      <Dialog.Description>Focus on the next decision.</Dialog.Description>
      <label class="filter-field">Status
        <select bind:value={draft.filter} aria-label="Filter by status">
          {#each statuses as option}<option value={option.value}>{option.label}</option>{/each}
        </select>
      </label>
      <label class="filter-field">Media type
        <select bind:value={draft.mediaType} aria-label="Filter by media type">
          <option value="all">All types</option><option value="video">Video</option><option value="image">Image</option>
        </select>
      </label>
      <label class="filter-field">Minimum rating
        <select bind:value={draft.minRating} aria-label="Filter by minimum rating">
          <option value={0}>Any rating</option><option value={1}>1 star or higher</option><option value={2}>2 stars or higher</option><option value={3}>3 stars or higher</option><option value={4}>4 stars or higher</option><option value={5}>5 stars</option>
        </select>
      </label>
      <label class="filter-field">Sort by
        <select bind:value={draft.sort} aria-label="Sort media">
          <option value={undefined}>Original order</option><option value="name">Name</option><option value="status">Status</option><option value="rating">Rating</option>
        </select>
      </label>
      <div class="filter-actions">
        <button type="button" class="secondary-button" onclick={clear}>Clear</button>
        <button type="button" class="primary-button" onclick={apply}><Check size={16} /> Apply</button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
