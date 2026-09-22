<script lang="ts">
  import { Bookmark, Check } from 'lucide-svelte';
  import MediaThumbnail from './MediaThumbnail.svelte';
  import type { LocalAsset } from '$lib/review';
  import type { AssetReview } from '$lib/review-session';
  import type { AppearanceValue } from '$lib/appearance';
  import { CARD_FIELD_DEFINITIONS, type CardFieldId } from '../../../../src/lib/cardFields';

  type Asset = LocalAsset & AssetReview;
  let { assets, activeId, checkedIds, appearance, view, onOpen, onCheck }: {
    assets: readonly Asset[]; activeId: string | null; checkedIds: readonly string[];
    appearance: AppearanceValue; view: 'grid' | 'list';
    onOpen: (id: string) => void; onCheck: (id: string, event: MouseEvent, toggle?: boolean) => void;
  } = $props();
  const fields = $derived(appearance.fieldOrder.filter(id => appearance.visibleFields.includes(id)));
  const labels = Object.fromEntries(CARD_FIELD_DEFINITIONS.map(field => [field.id, field.label]));
  function fieldValue(asset: Asset, field: CardFieldId): string {
    switch (field) {
      case 'status': return asset.status.replaceAll('_', ' ');
      case 'rating': return asset.rating ? `${asset.rating} ★` : 'Unrated';
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
    <article class="media-card" class:active-card={activeId === asset.id} class:checked-card={checkedIds.includes(asset.id)}>
      <button type="button" class="card-open" aria-label={`Open ${asset.name}`} aria-current={activeId === asset.id ? 'true' : undefined}
        onclick={event => event.metaKey || event.ctrlKey || event.shiftKey ? onCheck(asset.id, event) : onOpen(asset.id)}>
        <div class="thumbnail">
          <MediaThumbnail src={asset.url} poster={asset.poster} type={asset.type} name={asset.name}/>
          <span class="asset-type">{asset.assetClass}</span>
          {#if asset.shortlisted}<span class="shortlist-icon"><Bookmark size={13} fill="currentColor"/></span>{/if}
        </div>
        {#if appearance.showInfo}<div class="card-body"><strong title={asset.name}>{asset.name}</strong>
          {#if fields.length}<div class="card-fields">{#each fields as field (field)}<span title={`${labels[field]}: ${fieldValue(asset, field)}`} aria-label={`${labels[field]}: ${fieldValue(asset, field)}`}>{fieldValue(asset, field)}</span>{/each}</div>{/if}
        </div>{/if}
      </button>
      <button type="button" class="card-check" role="checkbox" aria-checked={checkedIds.includes(asset.id)} aria-label={`Select ${asset.name}`} onclick={event => onCheck(asset.id, event, true)}>
        {#if checkedIds.includes(asset.id)}<Check size={12}/>{/if}
      </button>
    </article>
  {/each}
</div>

<style>
  .media-card { position: relative; }
  .card-open { display: block; width: 100%; padding: 0; color: inherit; background: transparent; text-align: left; }
  .list-layout .media-card { display: block; }
  .list-layout .card-open { display: flex; align-items: center; }
  .card-check { position: absolute; top: 7px; left: 7px; display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid #a5bab663; border-radius: 4px; background: #0c1112c9; color: var(--teal); opacity: 0; transition: opacity 90ms; }
  .media-card:hover .card-check, .media-card:focus-within .card-check, .checked-card .card-check { opacity: 1; }
  .checked-card { outline: 1px solid var(--teal); outline-offset: -1px; }
  .card-check[aria-checked='true'] { background: #224c43; border-color: var(--teal); }
  .card-body { padding: 10px; }
  .card-body .card-fields { overflow: hidden; white-space: nowrap; margin-top: 5px; gap: 0; font-size: 10px; }
  .card-fields span { flex-shrink: 0; }
  .card-fields span + span::before { content: '·'; margin: 0 6px; color: var(--muted); }
  .card-open:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
  @media (pointer: coarse) { .card-check { opacity: 1; width: 32px; height: 32px; } .card-check::before { content: ''; position: absolute; inset: -6px; } }
</style>
