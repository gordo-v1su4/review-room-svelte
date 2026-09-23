<script lang="ts">
  import AssetStatusMenu from './AssetStatusMenu.svelte';
  import { Bookmark, Check, Star } from 'lucide-svelte';
  import MediaThumbnail from './MediaThumbnail.svelte';
  import type { ReviewAsset } from '$lib/review';
  import type { AssetReview, ReviewAccess, ReviewAction } from '$lib/review-session';
  import type { AppearanceValue } from '$lib/appearance';
  import { CARD_FIELD_DEFINITIONS, type CardFieldId } from '$lib/cardFields';

  type Asset = ReviewAsset & AssetReview;
  let { assets, activeId, checkedIds = [], appearance, view, onOpen, onCheck, busyIds = [], access = { kind: 'none' }, onReview, onDragStart, onDragEnd }: {
    assets: readonly Asset[]; activeId: string | null; checkedIds?: readonly string[];
    busyIds?: readonly string[];
    access?: ReviewAccess; onReview: (action: ReviewAction) => void;
    onDragStart?: (event: DragEvent, id: string) => void; onDragEnd?: () => void;
    appearance: AppearanceValue; view: 'grid' | 'list';
    onOpen: (id: string) => void; onCheck?: (id: string, event: MouseEvent, toggle?: boolean) => void;
  } = $props();
  const fields = $derived(appearance.fieldOrder.filter(id => appearance.visibleFields.includes(id)));
  const labels = Object.fromEntries(CARD_FIELD_DEFINITIONS.map(field => [field.id, field.label]));
  function fieldValue(asset: Asset, field: CardFieldId): string {
    switch (field) {
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

<div class="media-grid" class:list-layout={view === 'list'} data-thumbnail-fit={appearance.fit}
  style:--card-ratio={appearance.aspect === 'square' ? '1' : appearance.aspect === 'portrait' ? '9 / 16' : '16 / 9'}
  style:--card-fit={appearance.fit === 'fit' ? 'contain' : 'cover'}
  style:--card-width={appearance.size === 'small' ? '130px' : appearance.size === 'large' ? '280px' : '190px'}>
  {#each assets as asset (asset.id)}
    <article aria-busy={busyIds.includes(asset.id)} class="media-card" class:active-card={activeId === asset.id} class:checked-card={checkedIds.includes(asset.id)}>
      <button type="button" class="card-open" data-asset-id={asset.id} draggable={!!onDragStart && asset.status !== 'archived'} ondragstart={event => onDragStart?.(event, asset.id)} ondragend={onDragEnd} aria-label={`Open ${asset.name}`} aria-current={activeId === asset.id ? 'true' : undefined}
        onclick={event => (event.metaKey || event.ctrlKey || event.shiftKey) && onCheck ? onCheck(asset.id, event) : onOpen(asset.id)}>
        <div class="thumbnail">
          <MediaThumbnail src={asset.url} poster={asset.poster} type={asset.type} name={asset.name}/>
          <span class="asset-type">{asset.assetClass}</span>
          {#if asset.shortlisted}<span class="shortlist-icon"><Bookmark size={13} fill="currentColor"/></span>{/if}
        </div>
      </button>
      {#if appearance.showInfo}<div class="card-body">
        <button class="card-name" type="button" draggable={!!onDragStart && asset.status !== 'archived'} ondragstart={event => onDragStart?.(event, asset.id)} ondragend={onDragEnd} title={asset.name} onclick={event => (event.metaKey || event.ctrlKey || event.shiftKey) && onCheck ? onCheck(asset.id, event) : onOpen(asset.id)}>{asset.name}</button>
        {#if fields.length}<div class="card-fields">{#each fields as field (field)}
          {#if field === 'status'}<AssetStatusMenu status={asset.status} name={asset.name} access={busyIds.includes(asset.id) ? { kind: 'none' } : access} onChange={status => onReview({ type: 'status', assetId: asset.id, status })}/>
          {:else if field === 'rating'}<div class="card-rating" role="group" aria-label={`Rating for ${asset.name}`}>
            {#each [1, 2, 3, 4, 5] as rating (rating)}<button type="button" class="card-star" class:filled={asset.rating >= rating} aria-label={`Rate ${asset.name} ${rating} stars`} aria-pressed={asset.rating === rating} title={asset.rating === rating ? 'Clear rating' : `${rating} stars`} disabled={access.kind === 'none' || busyIds.includes(asset.id) || asset.status === 'archived'} onclick={() => onReview({ type: 'rate', assetId: asset.id, rating: asset.rating === rating ? 0 : rating })}><Star size={14} fill={asset.rating >= rating ? 'currentColor' : 'none'}/></button>{/each}
          </div>
          {:else}<span title={`${labels[field]}: ${fieldValue(asset, field)}`} aria-label={`${labels[field]}: ${fieldValue(asset, field)}`}>{fieldValue(asset, field)}</span>{/if}
        {/each}</div>{/if}
      </div>{/if}
      {#if onCheck}<button type="button" class="card-check" role="checkbox" aria-checked={checkedIds.includes(asset.id)} aria-label={`Select ${asset.name}`} onclick={event => onCheck(asset.id, event, true)}>
        {#if checkedIds.includes(asset.id)}<Check size={12}/>{/if}
      </button>{/if}
    </article>
  {/each}
</div>

<style>
  .media-card { position: relative; }
  .card-open { display: block; width: 100%; padding: 0; color: inherit; background: transparent; text-align: left; }
  .list-layout .media-card { display: flex; align-items: center; }
  .list-layout .card-open { flex: 0 0 74px; width: 74px; }
  .card-check { position: absolute; top: 7px; left: 7px; display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid #a5bab663; border-radius: 4px; background: #0c1112c9; color: var(--teal); opacity: 0; transition: opacity 90ms; }
  .media-card:hover .card-check, .media-card:focus-within .card-check, .checked-card .card-check { opacity: 1; }
  .card-check[aria-checked='true'] { background: #224c43; border-color: var(--teal); }
  .card-body { min-width: 0; padding: 8px 10px; }
  .card-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; padding: 0; border: 0; background: transparent; color: var(--ink); font-size: 12px; font-weight: 550; text-align: left; }
  .card-name:focus-visible { outline: 1px solid var(--teal); outline-offset: 2px; }
  .card-rating { display: flex; flex: 0 0 100%; min-width: 0; }
  .card-star { display: grid; place-items: center; flex: 0 1 24px; min-width: 0; height: 28px; padding: 0; background: transparent; color: var(--muted); border-radius: 3px; }
  .card-star.filled, .card-star:hover:not(:disabled) { color: var(--teal); }
  @media (pointer: coarse) { .card-star { flex-basis: 44px; height: 44px; } .media-grid:not(.list-layout) { grid-template-columns: repeat(auto-fill, minmax(min(100%, max(240px, var(--card-width))), 1fr)); } }
  .card-body .card-fields { display: flex; align-items: center; flex-wrap: wrap; white-space: nowrap; margin-top: 3px; gap: 0 8px; font-size: 10px; }
  .card-fields > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .card-open:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
  @media (pointer: coarse) { .card-check { opacity: 1; width: 32px; height: 32px; } .card-check::before { content: ''; position: absolute; inset: -6px; } }
</style>
