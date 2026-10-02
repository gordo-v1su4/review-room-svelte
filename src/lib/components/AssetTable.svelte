<script lang="ts">
  import { Bookmark, Film, Image } from 'lucide-svelte';
  import type { ReviewAsset } from '$lib/review';
  import type { AssetReview, ReviewAction } from '$lib/review-session';

  let { assets, activeId, checkedIds = [], onSelect, onCheck, onReview, onDragStart, onDragEnd }: {
    assets: readonly (ReviewAsset & AssetReview)[];
    activeId: string | null;
    onDragStart?: (event: DragEvent, id: string) => void; onDragEnd?: () => void;
    checkedIds?: readonly string[];
    onCheck: (id: string, event: MouseEvent, toggle?: boolean) => void;
    onSelect: (id: string, event: MouseEvent) => void;
    onReview: (action: ReviewAction) => void;
  } = $props();

  const statuses = [
    { value: 'not_started', label: 'Not started' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'awaiting_review', label: 'Awaiting review' },
    { value: 'needs_changes', label: 'Needs changes' },
    { value: 'approved', label: 'Approved' },
    { value: 'final', label: 'Final' },
    { value: 'omitted', label: 'Omitted' }
  ] as const;

  function changeStatus(assetId: string, value: string) {
    const status = statuses.find(status => status.value === value);
    if (status) onReview({ type: 'status', assetId, status: status.value });
  }
</script>

<!-- Keyboard focus allows horizontal scrolling without trapping focus in table controls. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="asset-table-region" role="region" aria-label="Media review table" tabindex="0">
  <table>
    <caption class="visually-hidden">Media and review decisions</caption>
    <thead><tr><th scope="col"><span class="visually-hidden">Selection</span></th><th scope="col">Asset</th><th scope="col">Status</th><th scope="col">Rating</th><th scope="col">Shortlist</th><th scope="col">Notes</th></tr></thead>
    <tbody>
      {#each assets as asset (asset.id)}
        <tr class:active-row={activeId === asset.id}>
          <td><input type="checkbox" aria-label={`Select ${asset.name}`} checked={checkedIds.includes(asset.id)} onclick={event => onCheck(asset.id, event, true)}/></td>
          <th scope="row">
            <button type="button" class="asset-title" data-asset-id={asset.id} draggable={!!onDragStart && asset.status !== 'archived'} ondragstart={event => onDragStart?.(event, asset.id)} ondragend={onDragEnd} aria-current={activeId === asset.id ? 'true' : undefined} onclick={event => event.metaKey || event.ctrlKey || event.shiftKey ? onCheck(asset.id, event) : onSelect(asset.id, event)} title={asset.name}>
              {#if asset.type === 'video'}<Film size={15}/>{:else}<Image size={15}/>{/if}
              <span class="asset-name">{asset.name}</span><span class="media-kind">{asset.assetClass}</span>
            </button>
          </th>
          <td>
            <select class="asset-status-select" data-status={asset.status} aria-label={`Status for ${asset.name}`} value={asset.status} onchange={event => changeStatus(asset.id, event.currentTarget.value)}>
              {#if asset.status === 'archived'}<option value="archived" disabled>Archived</option>{/if}
              {#each statuses as status (status.value)}<option value={status.value}>{status.label}</option>{/each}
            </select>
          </td>
          <td>
            <select aria-label={`Rating for ${asset.name}`} value={asset.rating} onchange={event => onReview({ type: 'rate', assetId: asset.id, rating: Number(event.currentTarget.value) })}>
              <option value={0}>Unrated</option>
              {#each [1, 2, 3, 4, 5] as rating (rating)}<option value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>{/each}
            </select>
          </td>
          <td><button type="button" class="shortlist-control" aria-label={`Shortlist ${asset.name}`} aria-pressed={asset.shortlisted} onclick={() => onReview({ type: 'shortlist', assetId: asset.id, shortlisted: !asset.shortlisted })}><Bookmark size={15} fill={asset.shortlisted ? 'currentColor' : 'none'}/></button></td>
          <td class="note-count">{asset.comments.length}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .asset-table-region { width: 100%; max-width: 100%; min-width: 0; overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; background: var(--panel); }
  table { width: 100%; min-width: 610px; border-collapse: collapse; font-size: 12px; text-align: left; }
  th, td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  thead th { color: var(--muted); font-size: 10px; font-weight: 500; letter-spacing: .025em; background: var(--canvas); }
  tbody th { font-weight: 400; max-width: 300px; min-width: 170px; }
  tr:last-child th, tr:last-child td { border-bottom: 0; }
  .active-row { background: color-mix(in srgb, var(--accent) 16%, var(--panel)); }
  .asset-title { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 30px; background: transparent; text-align: left; }
  .asset-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .media-kind { font-size: 9px; color: var(--muted); margin-left: auto; }
  select { min-height: 30px; max-width: 160px; padding: 4px 22px 4px 7px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); color: var(--ink); font: inherit; cursor: pointer; }
  .shortlist-control { min-height: 30px; min-width: 30px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: var(--muted); }
  .shortlist-control[aria-pressed='true'] { color:var(--selection-accent); background:var(--raised); }
  .note-count { color: var(--muted); font-variant-numeric: tabular-nums; }
  input[type='checkbox'] { accent-color:var(--teal); }
  select:focus-visible, .asset-table-region:focus-visible { outline: 2px solid var(--teal); outline-offset: 3px; }
  @media (pointer: coarse), (max-width: 760px) {
    select, .asset-title, .shortlist-control { min-height: 44px; }
    .shortlist-control { min-width: 44px; }
    th, td { padding: 8px; }
  }
</style>
