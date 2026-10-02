<script lang="ts">
  import { Popover } from 'bits-ui';
  import { updateTags } from '../bulk-tags';
  import type { VideoStatus } from '$lib/types';
  import type { ReviewAccess } from '../review-session';
  import { selectionPermissions } from '../media-selection';
  import DeleteSelected from './DeleteSelected.svelte';
  let { count, visibleCount, access = { kind: 'none' }, onselectvisible, onclear, onshortlist, onstatus, onrate, onTags, canEditMetadata = false, selectedAssets = [], onDelete }: {
    selectedAssets?: readonly { id: string; title: string }[];
    onDelete?: (ids: string[]) => Promise<void>;
    onTags?: (tags: string[], mode: 'add' | 'remove') => void;
    canEditMetadata?: boolean;
    count: number;
    visibleCount: number;
    access?: ReviewAccess;
    onselectvisible: () => void;
    onclear: () => void;
    onshortlist: (shortlisted: boolean) => void;
    onstatus: (status: VideoStatus) => void;
    onrate: (rating: number) => void;
  } = $props();
  let tagsOpen = $state(false), tagInput = $state('');
  const parsedTags = $derived(updateTags([], tagInput.split(','), 'add'));
  function applyTags(mode: 'add' | 'remove') {
    if (!canEditMetadata || !onTags || count <= 0 || !parsedTags.length) return;
    onTags(parsedTags, mode);
    tagInput = ''; tagsOpen = false;
  }
  const permissions = $derived(selectionPermissions(access));
  const labels: Record<VideoStatus, string> = {
    not_started: 'Not started', in_progress: 'In progress', awaiting_review: 'Awaiting review',
    needs_changes: 'Needs changes', approved: 'Approved', final: 'Final', omitted: 'Omitted', archived: 'Archived',
  };
  function statusChanged(event: Event) {
    const control = event.currentTarget as HTMLSelectElement;
    const status = control.value as VideoStatus;
    if (count > 0 && permissions.statuses.includes(status)) onstatus(status);
    control.value = '';
  }
  function ratingChanged(event: Event) {
    const control = event.currentTarget as HTMLSelectElement;
    const rating = Number(control.value);
    if (control.value !== '' && count > 0 && permissions.rate && Number.isInteger(rating) && rating >= 0 && rating <= 5) onrate(rating);
    control.value = '';
  }
</script>

<div class="selection-bar" role="group" aria-label="Selected asset actions">
  <span class="selection-count" aria-live="polite">{count} selected</span>
  <button type="button" disabled={visibleCount === 0} onclick={onselectvisible}>Select all visible</button>
  <button type="button" disabled={count === 0} onclick={onclear}>Clear</button>
  {#if onDelete}<DeleteSelected assets={selectedAssets} canDelete={access.kind === 'project' && access.memberRole === 'owner'} {onDelete}/>{/if}
  {#if permissions.shortlist}
    <button type="button" disabled={count === 0} onclick={() => { if (count > 0 && permissions.shortlist) onshortlist(true); }}>Shortlist</button>
    <button type="button" disabled={count === 0} onclick={() => { if (count > 0 && permissions.shortlist) onshortlist(false); }}>Unshortlist</button>
  {/if}
  {#if permissions.statuses.length}
    <select aria-label="Set status for selected assets" disabled={count === 0} value="" onchange={statusChanged}>
      <option value="" disabled>Status</option>
      {#each permissions.statuses as status (status)}<option value={status}>{labels[status]}</option>{/each}
    </select>
  {/if}
  {#if canEditMetadata && onTags}
    <Popover.Root bind:open={tagsOpen}>
      <Popover.Trigger disabled={count === 0}>Tags</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class="bulk-tags-popover" sideOffset={8} align="end" collisionPadding={12} aria-label="Edit selected asset tags">
          <label>Tags<input bind:value={tagInput} placeholder="Hero, night, close-up" autocomplete="off" /></label>
          <p>Separate tags with commas. Applies to {count} selected {count === 1 ? 'asset' : 'assets'}.</p>
          <div class="bulk-tags-actions">
            <button type="button" disabled={count === 0 || !parsedTags.length} onclick={() => applyTags('add')}>Add tags</button>
            <button type="button" disabled={count === 0 || !parsedTags.length} onclick={() => applyTags('remove')}>Remove tags</button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  {/if}
  {#if permissions.rate}
    <select aria-label="Rate selected assets" disabled={count === 0} value="" onchange={ratingChanged}>
      <option value="" disabled>Rating</option>
      <option value="0">Clear rating</option>
      {#each [1, 2, 3, 4, 5] as rating (rating)}<option value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>{/each}
    </select>
  {/if}
</div>

<style>
  :global(.bulk-tags-popover) { z-index: 70; width: min(290px, calc(100vw - 24px)); padding: 14px; border: 1px solid var(--border, #30383a); border-radius: 10px; background: var(--surface, #171c1d); color: var(--text, #e6eceb); box-shadow: 0 12px 32px #0005; }
  :global(.bulk-tags-popover) label { display: grid; gap: 8px; font-size: 12px; }
  :global(.bulk-tags-popover) input { box-sizing: border-box; width: 100%; padding: 9px; border: 1px solid var(--border, #30383a); border-radius: 5px; background: #0003; color: inherit; font: inherit; }
  :global(.bulk-tags-popover) p { margin: 9px 0 12px; color: var(--muted, #9ca9a5); font-size: 11px; line-height: 1.5; }
  .bulk-tags-actions { display: flex; gap: 8px; }
  .bulk-tags-actions button { flex: 1; padding: 8px; border: 1px solid var(--border, #30383a); border-radius: 5px; background: #ffffff08; color: inherit; font: inherit; font-size: 12px; cursor: pointer; }
  .bulk-tags-actions button:disabled { opacity: .4; cursor: default; }
</style>
