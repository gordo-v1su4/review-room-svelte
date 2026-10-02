<script lang="ts">
  import { Popover, DropdownMenu } from 'bits-ui';
  import { CheckCheck, X, Bookmark, CircleCheck, Tags } from 'lucide-svelte';
  import { updateTags } from '../bulk-tags';
  import type { VideoStatus } from '$lib/types';
  import type { ReviewAccess } from '../review-session';
  import { selectionPermissions } from '../media-selection';
  import DeleteSelected from './DeleteSelected.svelte';
  let { count, visibleCount, access = { kind: 'none' }, onselectvisible, onclear, onshortlist, onstatus, onrate, onTags, canEditMetadata = false, selectedAssets = [], onDelete }: {
    selectedAssets?: readonly { id: string; title: string; shortlisted?: boolean }[];
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
  const allShortlisted = $derived(selectedAssets.length > 0 && selectedAssets.every(asset => asset.shortlisted));
  const labels: Record<VideoStatus, string> = {
    not_started: 'Not started', in_progress: 'In progress', awaiting_review: 'Awaiting review',
    needs_changes: 'Needs changes', approved: 'Approved', final: 'Final', omitted: 'Omitted', archived: 'Archived',
  };
</script>

<div class="selection-bar" role="group" aria-label="Selected asset actions">
  <span class="sr-only" aria-live="polite">{count} selected</span>
  <button type="button" title="Select all visible" aria-label="Select all visible" disabled={visibleCount === 0} onclick={onselectvisible}><CheckCheck size={16}/><span class="selection-label">Select all</span></button>
  <button type="button" title="Clear selection" aria-label="Clear" disabled={count === 0} onclick={onclear}><X size={16}/><span class="selection-label">Clear</span></button>
  {#if onDelete}<DeleteSelected assets={selectedAssets} canDelete={access.kind === 'project' && access.memberRole === 'owner'} {onDelete}/>{/if}
  {#if permissions.shortlist}
    <button type="button" class:shortlisted={allShortlisted} aria-pressed={allShortlisted} aria-label={allShortlisted ? 'Remove selected from shortlist' : 'Add selected to shortlist'} title={allShortlisted ? 'Remove selected from shortlist' : 'Add selected to shortlist'} disabled={count === 0} onclick={() => onshortlist(!allShortlisted)}><Bookmark size={16} fill={allShortlisted ? 'currentColor' : 'none'}/><span class="selection-label">Shortlist</span></button>
  {/if}
  {#if permissions.statuses.length || permissions.rate}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger title="Review selected clips" aria-label="Review selected clips" disabled={count === 0}><CircleCheck size={16}/><span class="selection-label">Review</span></DropdownMenu.Trigger>
      <DropdownMenu.Portal><DropdownMenu.Content class="selection-menu" sideOffset={6} align="end" collisionPadding={12}>
        {#if permissions.statuses.length}
          <div role="group" aria-label="Set status for selected assets">
            <div class="selection-menu-label">Status</div>
            {#each permissions.statuses as status (status)}<DropdownMenu.Item onSelect={() => onstatus(status)}>{labels[status]}</DropdownMenu.Item>{/each}
          </div>
        {/if}
        {#if permissions.rate}
          <div role="group" aria-label="Rate selected assets">
            <div class="selection-menu-label">Rating</div>
            <DropdownMenu.Item onSelect={() => onrate(0)}>Clear rating</DropdownMenu.Item>
            {#each [1, 2, 3, 4, 5] as rating (rating)}<DropdownMenu.Item onSelect={() => onrate(rating)}>{rating} {rating === 1 ? 'star' : 'stars'}</DropdownMenu.Item>{/each}
          </div>
        {/if}
      </DropdownMenu.Content></DropdownMenu.Portal>
    </DropdownMenu.Root>
  {/if}
  {#if canEditMetadata && onTags}
    <Popover.Root bind:open={tagsOpen}>
      <Popover.Trigger title="Edit selected tags" aria-label="Tags" disabled={count === 0}><Tags size={16}/><span class="selection-label">Tags</span></Popover.Trigger>
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
</div>

<style>
  :global(.bulk-tags-popover) { z-index: 70; width: min(290px, calc(100vw - 24px)); padding: 14px; border: 1px solid var(--border, #30383a); border-radius: 10px; background: var(--surface, #171c1d); color: var(--text, #e6eceb); box-shadow: 0 12px 32px #0005; }
  :global(.bulk-tags-popover) label { display: grid; gap: 8px; font-size: 12px; }
  :global(.bulk-tags-popover) input { box-sizing:border-box; width:100%; height:32px; min-height:32px; padding:5px 8px; border:1px solid var(--border,#30383a); border-radius:5px; background:var(--panel,#101415); color:inherit; font:inherit; }
  :global(.bulk-tags-popover) input:focus-visible { outline:1px solid var(--selection-accent); outline-offset:1px; }
  :global(.bulk-tags-popover) p { margin: 9px 0 12px; color: var(--muted, #9ca9a5); font-size: 11px; line-height: 1.5; }
  .bulk-tags-actions { display: flex; gap: 8px; }
  .bulk-tags-actions button { flex: 1; padding: 8px; border: 1px solid var(--border, #30383a); border-radius: 5px; background: #ffffff08; color: inherit; font: inherit; font-size: 12px; cursor: pointer; }
  .bulk-tags-actions button:disabled { opacity: .4; cursor: default; }
</style>
