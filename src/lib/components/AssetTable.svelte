<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import PhoneSelect from './PhoneSelect.svelte';
  const phoneViewport = new MediaQuery('(max-width: 640px)', false);
  import { formatVersion } from '../../../convex/lib/shotCode';
  import { Bookmark, Film, Image } from 'lucide-svelte';
  import type { ReviewAsset } from '$lib/review';
  import type { AssetReview, ReviewAction } from '$lib/review-session';

  let { assets, activeId, checkedIds = [], onSelect, onCheck, onReview, onDragStart, onDragEnd, onFixMisfiled }: {
    assets: readonly (ReviewAsset & AssetReview)[];
    activeId: string | null;
    onDragStart?: (event: DragEvent, id: string) => void; onDragEnd?: () => void;
    onFixMisfiled?: (id: string) => void;
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
  const ratings = [{ value: '0', label: 'Unrated' }, ...[1,2,3,4,5].map(rating => ({ value: String(rating), label: `${rating} ${rating === 1 ? 'star' : 'stars'}` }))];

  function changeStatus(assetId: string, value: string) {
    const status = statuses.find(status => status.value === value);
    if (status) onReview({ type: 'status', assetId, status: status.value });
  }
</script>

{#snippet statusControl(asset: ReviewAsset & AssetReview)}<PhoneSelect triggerClass="asset-status-select" status={asset.status} label={`Status for ${asset.name}`} value={asset.status} items={asset.status === "archived" ? [{value:"archived",label:"Archived",disabled:true},...statuses] : [...statuses]} onValueChange={value => changeStatus(asset.id,value)}/>{/snippet}
{#snippet ratingControl(asset: ReviewAsset & AssetReview)}<PhoneSelect label={`Rating for ${asset.name}`} value={String(asset.rating)} items={ratings} onValueChange={value => onReview({type:"rate",assetId:asset.id,rating:Number(value)})}/>{/snippet}

<!-- Keyboard focus allows horizontal scrolling without trapping focus in table controls. -->
{#if phoneViewport.current}
<div class="phone-asset-rows" aria-label="Media review rows">
  {#each assets as asset (asset.id)}
    <details class="phone-asset-row" class:active-row={activeId === asset.id}>
      <summary><span class="phone-asset-name">{asset.name}</span><span class="version-tag">{formatVersion(asset.versionNumber ?? 1)}</span></summary>
      <div class="phone-asset-fields">
        <button type="button" class="asset-title" data-asset-id={asset.id} onclick={event => onSelect(asset.id, event)}>{#if asset.type === 'video'}<Film size={15}/>{:else}<Image size={15}/>{/if}Open review</button>
        <label class="phone-check"><input type="checkbox" aria-label={`Select ${asset.name}`} checked={checkedIds.includes(asset.id)} onclick={event => onCheck(asset.id, event, true)}/>Select asset</label>
        <label>Status<PhoneSelect triggerClass="asset-status-select" status={asset.status} label={`Status for ${asset.name}`} value={asset.status} items={asset.status === 'archived' ? [{value:'archived',label:'Archived',disabled:true},...statuses] : [...statuses]} onValueChange={value => changeStatus(asset.id,value)}/></label>
        <label>Rating<PhoneSelect label={`Rating for ${asset.name}`} value={String(asset.rating)} items={ratings} onValueChange={value => onReview({type:'rate',assetId:asset.id,rating:Number(value)})}/></label>
        <button type="button" class="shortlist-control phone-shortlist" aria-label={`Shortlist ${asset.name}`} aria-pressed={asset.shortlisted} onclick={() => onReview({type:'shortlist',assetId:asset.id,shortlisted:!asset.shortlisted})}><Bookmark size={15} fill={asset.shortlisted ? 'currentColor' : 'none'}/></button><span class="note-count">{asset.comments.length} notes</span>
        {#if asset.misfiled && onFixMisfiled}<button type="button" class="misfiled-tag" onclick={() => onFixMisfiled?.(asset.id)}>Misfiled · File…</button>{/if}
      </div>
    </details>
  {/each}
</div>
{:else}
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="asset-table-region" role="region" aria-label="Media review table" tabindex="0">
  <table>
    <caption class="visually-hidden">Media and review decisions</caption>
    <thead><tr><th scope="col"><span class="visually-hidden">Selection</span></th><th scope="col">Asset</th><th scope="col">Status</th><th scope="col">Rating</th><th scope="col">Shortlist</th><th scope="col">Notes</th></tr></thead>
    <tbody>
      {#each assets as asset (asset.id)}
        <tr class:active-row={activeId === asset.id} class:misfiled-row={asset.misfiled}>
          <td><input type="checkbox" aria-label={`Select ${asset.name}`} checked={checkedIds.includes(asset.id)} onclick={event => onCheck(asset.id, event, true)}/></td>
          <th scope="row">
            <button type="button" class="asset-title" data-asset-id={asset.id} draggable={!!onDragStart && asset.status !== 'archived'} ondragstart={event => onDragStart?.(event, asset.id)} ondragend={onDragEnd} aria-current={activeId === asset.id ? 'true' : undefined} onclick={event => event.metaKey || event.ctrlKey || event.shiftKey ? onCheck(asset.id, event) : onSelect(asset.id, event)} title={asset.name}>
              {#if asset.type === 'video'}<Film size={15}/>{:else}<Image size={15}/>{/if}
              <span class="asset-name">{asset.name}</span>{#if asset.versionNumber}<span class="version-tag">{formatVersion(asset.versionNumber)}</span>{/if}<span class="media-kind">{asset.assetClass}</span>
            </button>
            {#if asset.misfiled}{#if onFixMisfiled}<button type="button" class="misfiled-tag" title="Dropped without a matching shot code. File it as a take or move it." onclick={() => onFixMisfiled(asset.id)}>Misfiled · File…</button>{:else}<span class="misfiled-tag">Misfiled</span>{/if}{/if}
          </th>
          <td>
            {@render statusControl(asset)}
          </td>
          <td>
            {@render ratingControl(asset)}
          </td>
          <td><button type="button" class="shortlist-control" aria-label={`Shortlist ${asset.name}`} aria-pressed={asset.shortlisted} onclick={() => onReview({ type: 'shortlist', assetId: asset.id, shortlisted: !asset.shortlisted })}><Bookmark size={15} fill={asset.shortlisted ? 'currentColor' : 'none'}/></button></td>
          <td class="note-count">{asset.comments.length}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
{/if}

<style>
  .phone-asset-rows { display:none; }
  .asset-table-region { width: 100%; max-width: 100%; min-width: 0; overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; background: var(--panel); }
  table { width: 100%; min-width: 610px; border-collapse: collapse; font-size: 12px; text-align: left; }
  th, td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  thead th { color: var(--muted); font-size: 10px; font-weight: 500; letter-spacing: .025em; background: var(--canvas); }
  tbody th { font-weight: 400; max-width: 300px; min-width: 170px; }
  tr:last-child th, tr:last-child td { border-bottom: 0; }
  .active-row { background: color-mix(in srgb, var(--accent) 16%, var(--panel)); }
  .asset-title { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 30px; background: transparent; text-align: left; }
  .misfiled-row th { box-shadow: inset 2px 0 0 var(--status-needs-changes); }
  .misfiled-tag { margin-left: 6px; padding: 1px 6px; border: 0; border-radius: 4px; background: #3a1d1d; color: var(--status-needs-changes); font: inherit; font-size: 10px; font-weight: 600; white-space: nowrap; }
  button.misfiled-tag { cursor: pointer; }
  button.misfiled-tag:focus-visible { outline: 1px solid var(--status-needs-changes); outline-offset: 2px; }
  .version-tag { flex-shrink: 0; color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
  .asset-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .media-kind { font-size: 9px; color: var(--muted); margin-left: auto; }
  :global(.phone-select-trigger:where(.asset-table-region *, .phone-asset-rows *)) { min-height: 30px; max-width: 160px; padding: 4px 22px 4px 7px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); color: var(--ink); font: inherit; cursor: pointer; }
  .shortlist-control { min-height: 30px; min-width: 30px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: var(--muted); }
  .shortlist-control[aria-pressed='true'] { color:var(--selection-accent); background:var(--raised); }
  .note-count { color: var(--muted); font-variant-numeric: tabular-nums; }
  input[type='checkbox'] { accent-color:var(--teal); }
  :global(.phone-select-trigger:where(.asset-table-region *, .phone-asset-rows *)):focus-visible, .asset-table-region:focus-visible { outline: 2px solid var(--teal); outline-offset: 3px; }
  @media (pointer: coarse), (max-width: 760px) {
    :global(.phone-select-trigger:where(.asset-table-region *, .phone-asset-rows *)), .asset-title, .shortlist-control { min-height: 44px; }
    .shortlist-control { min-width: 44px; }
    th, td { padding: 8px; }
  }
  @media(max-width:640px) {
    .asset-table-region { display:none; }
    .phone-asset-rows { display:grid;gap:8px;min-width:0; }
    .phone-asset-row { min-width:0;border:1px solid var(--border);border-radius:8px;background:var(--panel); }
    summary { display:flex;align-items:center;gap:8px;min-height:52px;padding:10px 12px;cursor:pointer;font-size:12px; }
    summary::after { content:'+';margin-left:auto;color:var(--muted); }
    details[open] summary::after { content:'−'; }
    summary::-webkit-details-marker { display:none; }
    summary:focus-visible { outline:1px solid var(--teal);outline-offset:2px; }
    .phone-asset-name { min-width:0;overflow-wrap:anywhere; }
    .phone-asset-fields { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:center;gap:12px;padding:12px;border-top:1px solid var(--border); }
    label { display:grid;gap:6px;min-width:0;color:var(--muted);font-size:11px; }
    :global(.phone-select-trigger:where(.asset-table-region *, .phone-asset-rows *)) { width:100%;max-width:100%;font-size:16px; }
    .phone-check { display:flex;align-items:center;gap:8px;min-height:44px; }
    .asset-title { min-height:28px;font-size:11px; }
    .phone-shortlist { display:grid;place-items:center;justify-self:start;min-width:28px;width:28px;min-height:28px;height:28px;padding:0;border:0;border-radius:5px;background:var(--canvas); }
  }
</style>
