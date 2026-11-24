<script lang="ts">
  import AssetStatusMenu from './AssetStatusMenu.svelte';
  import { Bookmark, Check, Star } from 'lucide-svelte';
  import MediaThumbnail from './MediaThumbnail.svelte';
  import type { ReviewAsset } from '$lib/review';
  import type { AssetReview, ReviewAccess, ReviewAction } from '$lib/review-session';
  import type { AppearanceValue } from '$lib/appearance';
  import { CARD_FIELD_DEFINITIONS, type CardFieldId } from '$lib/cardFields';
  import { formatVersion } from '../../../convex/lib/shotCode';
  import VersionPicker, { type VersionOption } from './VersionPicker.svelte';

  type Asset = ReviewAsset & AssetReview;
  let { assets, activeId, checkedIds = [], appearance, view, onOpen, onCheck, busyIds = [], access = { kind: 'none' }, onReview, onDragStart, onDragEnd, onFixMisfiled, versionsFor, currentVersionFor, onSelectVersion }: {
    /** Signed-in views: every take of an asset, the saved current take, and switching the displayed take. */
    versionsFor?: (assetId: string) => readonly VersionOption[];
    currentVersionFor?: (assetId: string) => string | undefined;
    onSelectVersion?: (assetId: string, versionId: string) => void;
    assets: readonly Asset[]; activeId: string | null; checkedIds?: readonly string[];
    busyIds?: readonly string[];
    access?: ReviewAccess; onReview: (action: ReviewAction) => void;
    onDragStart?: (event: DragEvent, id: string) => void; onDragEnd?: () => void;
    /** Opens the fix-up for a file dropped into a locked folder without a matching shot code. */
    onFixMisfiled?: (id: string) => void;
    appearance: AppearanceValue; view: 'grid' | 'list';
    onOpen: (id: string, event: MouseEvent) => void; onCheck?: (id: string, event: MouseEvent, toggle?: boolean) => void;
  } = $props();
  const showVersion = $derived(appearance.visibleFields.includes('version'));
  const fields = $derived(appearance.fieldOrder.filter(id => id !== 'version' && appearance.visibleFields.includes(id)));
  const showShortlist = $derived(fields.includes('shortlist'));
  const showRating = $derived(fields.includes('rating'));
  const labels = Object.fromEntries(CARD_FIELD_DEFINITIONS.map(field => [field.id, field.label]));
  function fieldValue(asset: Asset, field: CardFieldId): string {
    switch (field) {
      case 'version': return asset.versionNumber ? formatVersion(asset.versionNumber) : '—';
      case 'status': return asset.status.replaceAll('_', ' ');
      case 'rating': return String(asset.rating);
      case 'shortlist': return asset.shortlisted ? 'Shortlisted' : 'Not shortlisted';
      case 'uploader': return '—';
      case 'uploadedAt': return `Added ${new Date(asset.importedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      case 'duration': return asset.duration === undefined ? '—' : `${Math.floor(asset.duration / 60)}:${String(Math.floor(asset.duration % 60)).padStart(2, '0')}`;
      case 'resolution': return asset.width && asset.height ? `${asset.width} × ${asset.height}` : '—';
      case 'assetCode': return asset.assetCode || '—';
      case 'assetClass': return asset.assetClass;
      case 'commentCount': return `${asset.comments.length} ${asset.comments.length === 1 ? 'note' : 'notes'}`;
      case 'tags': return asset.tags.join(', ') || 'No tags';
      case 'filename': return asset.sourceFile.name;
    }
  }
</script>

{#snippet bookmarkControl(asset: Asset)}
  <button type="button" class="card-bookmark" class:filled={asset.shortlisted} aria-label={`${asset.shortlisted ? 'Remove' : 'Add'} ${asset.name} ${asset.shortlisted ? 'from' : 'to'} shortlist`} aria-pressed={asset.shortlisted} title={asset.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} disabled={access.kind === 'none' || busyIds.includes(asset.id) || asset.status === 'archived'} onclick={() => onReview({type:'shortlist',assetId:asset.id,shortlisted:!asset.shortlisted})}><Bookmark size={14} fill={asset.shortlisted ? 'currentColor' : 'none'}/></button>
{/snippet}

<div class="media-grid" class:list-layout={view === 'list'} data-thumbnail-fit={appearance.fit}
  style:--card-ratio={appearance.aspect === 'square' ? '1' : appearance.aspect === 'portrait' ? '9 / 16' : '16 / 9'}
  style:--card-fit={appearance.fit === 'fit' ? 'contain' : 'cover'}
  style:--card-width={appearance.size === 'small' ? '130px' : appearance.size === 'large' ? '280px' : '190px'}>
  {#each assets as asset (asset.id)}
    <article aria-busy={busyIds.includes(asset.id)} class="media-card" class:active-card={activeId === asset.id} class:checked-card={checkedIds.includes(asset.id)} class:misfiled-card={asset.misfiled}>
      <button type="button" class="card-open" data-asset-id={asset.id} draggable={!!onDragStart && asset.status !== 'archived'} ondragstart={event => onDragStart?.(event, asset.id)} ondragend={onDragEnd} aria-label={`Open ${asset.name}`} aria-current={activeId === asset.id ? 'true' : undefined}
        onclick={event => (event.metaKey || event.ctrlKey || event.shiftKey) && onCheck ? onCheck(asset.id, event) : onOpen(asset.id, event)}>
        <div class="thumbnail">
          <MediaThumbnail src={asset.url} poster={asset.poster} sprite={asset.sprite} type={asset.type} name={asset.name} availability={asset.availability ?? 'ready'}/>
          <span class="asset-type">{asset.assetClass}</span>
        </div>
      </button>
      {#if appearance.showInfo}<div class="card-body">
        <div class="card-title"><button class="card-name" type="button" draggable={!!onDragStart && asset.status !== 'archived'} ondragstart={event => onDragStart?.(event, asset.id)} ondragend={onDragEnd} title={asset.name} onclick={event => (event.metaKey || event.ctrlKey || event.shiftKey) && onCheck ? onCheck(asset.id, event) : onOpen(asset.id, event)}>{asset.name}</button>{#if showVersion}{#if onSelectVersion && versionsFor && asset.versionId && versionsFor(asset.id).length}<VersionPicker compact label={`Version of ${asset.name}`} versions={versionsFor(asset.id)} value={asset.versionId} currentId={currentVersionFor?.(asset.id)} onChange={versionId => onSelectVersion(asset.id, versionId)}/>{:else if asset.versionNumber}<span class="version-tag">{formatVersion(asset.versionNumber)}</span>{/if}{/if}</div>
  {#if fields.length}<div class="card-fields">{#each fields as field (field)}
          {#if field === 'status'}<AssetStatusMenu status={asset.status} name={asset.name} access={busyIds.includes(asset.id) ? { kind: 'none' } : access} onChange={status => onReview({ type: 'status', assetId: asset.id, status })}/>
          {:else if field === 'rating'}<div class="card-rating" role="group" aria-label={`Rating for ${asset.name}`}>
            {#if showShortlist}{@render bookmarkControl(asset)}{/if}
            {#each [1, 2, 3, 4, 5] as rating (rating)}<button type="button" class="card-star" class:filled={asset.rating >= rating} aria-label={`Rate ${asset.name} ${rating} stars`} aria-pressed={asset.rating === rating} title={asset.rating === rating ? 'Clear rating' : `${rating} stars`} disabled={access.kind === 'none' || busyIds.includes(asset.id) || asset.status === 'archived'} onclick={() => onReview({ type: 'rate', assetId: asset.id, rating: asset.rating === rating ? 0 : rating })}><Star size={14} fill={asset.rating >= rating ? 'currentColor' : 'none'}/></button>{/each}
          </div>
          {:else if field === 'shortlist'}{#if !showRating}{@render bookmarkControl(asset)}{/if}
          {:else}<span title={`${labels[field]}: ${fieldValue(asset, field)}`} aria-label={`${labels[field]}: ${fieldValue(asset, field)}`}>{fieldValue(asset, field)}</span>{/if}
        {/each}</div>{/if}
      </div>{/if}
      {#if asset.misfiled}{#if onFixMisfiled}<button type="button" class="misfiled-badge" title="Dropped without a matching shot code. File it as a take or move it." onclick={() => onFixMisfiled(asset.id)}>Misfiled · File…</button>{:else}<span class="misfiled-badge">Misfiled</span>{/if}{/if}
      {#if onCheck}<button type="button" class="card-check" role="checkbox" aria-checked={checkedIds.includes(asset.id)} aria-label={`Select ${asset.name}`} title={`Select ${asset.name}`} onclick={event => onCheck(asset.id, event, true)}>
        {#if checkedIds.includes(asset.id)}<Check size={12}/>{/if}
      </button>{/if}
    </article>
  {/each}
</div>

<style>
  .media-card { position: relative; }
  .card-open { display: block; width: 100%; padding: 0; color: inherit; background: transparent; text-align: left; }
  .list-layout .media-card { display: flex; align-items: center; }
  .list-layout .card-open { position: relative; align-self: stretch; flex: 0 0 128px; width: 128px; min-height: 80px; }
  .list-layout .card-open .thumbnail { --card-fit: cover; position: absolute; inset: 0; width: 100%; height: 100%; aspect-ratio: auto; }
  .list-layout .card-body { padding: 8px 12px; }
  .list-layout .card-rating { flex: 0 0 auto; }
  .list-layout .card-fields { column-gap: 12px; }
  @media (max-width: 480px) { .list-layout .card-open { flex-basis: 92px; width: 92px; } }
  .card-check { position:absolute; top:7px; left:7px; display:grid; place-items:center; width:18px; height:18px; padding:0; border:1px solid #a5bab663; border-radius:3px; background:#0c1112c9; color:var(--selection-accent); opacity:0; transition:opacity 90ms; }
  .media-card:hover .card-check, .media-card:focus-within .card-check, .checked-card .card-check { opacity: 1; }
  .card-check[aria-checked='true'] { background:#18332e; border-color:var(--selection-accent); }
  .card-check:focus-visible { outline:2px solid var(--teal); outline-offset:3px; }
  .card-body { min-width: 0; padding: 8px 10px; }
  .card-title { display: flex; align-items: center; gap: 2px; min-width: 0; }
  .card-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 0 1 auto; min-width: 0; padding: 0; border: 0; background: transparent; color: var(--ink); font-size: 12px; font-weight: 550; text-align: left; }
  .misfiled-card { box-shadow: 0 0 0 1px color-mix(in srgb, var(--status-needs-changes) 70%, transparent); border-radius: 6px; }
  .misfiled-badge { position: absolute; top: 6px; right: 6px; z-index: 2; padding: 1px 6px; border: 0; border-radius: 4px; background: #3a1d1d; color: var(--status-needs-changes); font: inherit; font-size: 10px; font-weight: 600; }
  button.misfiled-badge { cursor: pointer; }
  button.misfiled-badge:hover { background: #4a2323; }
  button.misfiled-badge:focus-visible { outline: 1px solid var(--status-needs-changes); outline-offset: 2px; }
  .version-tag { flex: none; margin-left: 4px; color: var(--muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }
  .card-name:focus-visible { outline: 1px solid var(--teal); outline-offset: 2px; }
  .card-rating { display: flex; flex: 0 0 100%; min-width: 0; gap:4px; }
  .card-bookmark { display:grid;place-items:center;flex:0 1 24px;min-width:0;height:28px;padding:0;border:0;border-radius:3px;background:transparent;color:var(--muted); }
  .card-bookmark.filled,.card-bookmark:hover:not(:disabled) { color:var(--teal); }
  .card-bookmark:focus-visible { outline:1px solid var(--teal);outline-offset:1px; }
  .card-star { display: grid; place-items: center; flex: 0 1 24px; min-width: 0; height: 28px; padding: 0; background: transparent; color: var(--muted); border-radius: 3px; }
  .card-star.filled, .card-star:hover:not(:disabled) { color: var(--teal); }
  @media (pointer: coarse) { .card-star { flex-basis: 44px; height: 44px; } .media-grid:not(.list-layout) { grid-template-columns: repeat(auto-fill, minmax(min(100%, max(240px, var(--card-width))), 1fr)); } }
  .card-body .card-fields { display: flex; align-items: center; flex-wrap: wrap; white-space: nowrap; margin-top: 3px; gap: 0 8px; font-size: 10px; }
  .card-fields > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .card-open:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
  @media (pointer:coarse) { .card-check { opacity:1; width:22px; height:22px; top:11px; left:11px; } .card-check::before { content:''; position:absolute; inset:-11px; } }
  @media(max-width:640px) { .card-star { flex-basis:24px;height:28px; } }
</style>
