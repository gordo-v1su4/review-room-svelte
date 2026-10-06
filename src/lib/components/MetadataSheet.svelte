<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { SlidersHorizontal, X } from 'lucide-svelte';
  import AssetDetails from './AssetDetails.svelte';
  import type { ReviewAsset } from '$lib/review';
  import type { AssetReview } from '$lib/review-session';
  import type { AssetMetadataPatch, MetadataSaveState, VersionImageOption } from '$lib/asset-metadata';

  let { asset, review, knownTags, canEdit, onChange, onOpen, onDesktopClose, onSave, onReload, saveState, referenceImages = [] }: {
    onSave?: (id: string) => Promise<void>;
    onReload?: (id: string) => Promise<void>;
    referenceImages?: VersionImageOption[];
    saveState?: MetadataSaveState;
    asset: ReviewAsset;
    review: AssetReview;
    knownTags: readonly string[];
    canEdit: boolean;
    onChange: (id: string, patch: AssetMetadataPatch) => void;
    onOpen: () => void;
    onDesktopClose: () => void;
  } = $props();
  let open = $state(false);
  let editingId = $state<string | null>(null);
  function setOpen(next: boolean) {
    if (next) { onOpen(); editingId = asset.id; }
    open = next;
  }
  $effect(() => { if (open && asset.id !== editingId) open = false; });
</script>

<Dialog.Root {open} onOpenChange={setOpen}>
  <Dialog.Trigger class="metadata-sheet-trigger" aria-label="Asset fields"><SlidersHorizontal size={14}/>Fields</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay"/>
    <Dialog.Content class="filter-sheet metadata-sheet" onCloseAutoFocus={event => {
      if (!window.matchMedia('(max-width: 760px)').matches) { event.preventDefault(); onDesktopClose(); }
    }}>
      <div class="metadata-sheet-heading">
        <div><Dialog.Title class="dialog-title">Asset fields</Dialog.Title><Dialog.Description class="metadata-sheet-description">{asset.sourceFile.name}</Dialog.Description></div>
        <Dialog.Close class="metadata-sheet-close" aria-label="Close asset fields"><X size={17}/></Dialog.Close>
      </div>
      <div class="metadata-sheet-body"><AssetDetails {asset} {review} {knownTags} {canEdit} {onChange} {onSave} {onReload} {saveState} {referenceImages}/></div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.metadata-sheet-trigger) { display: none; align-items: center; justify-content: center; gap: 6px; min-height: 28px; padding: 0 8px; border: 1px solid var(--border); border-radius: 5px; background: var(--panel); color: var(--ink); font: inherit; font-size: 11px; }
  :global(.metadata-sheet) { display: flex; flex-direction: column; width: min(440px, calc(100vw - 28px)); max-height: 85svh; padding: 0; overflow: hidden; border-color: var(--border); border-radius: 10px; background: linear-gradient(155deg, var(--raised), var(--panel) 35%); box-shadow: inset 0 1px #d3eee609, 0 16px 50px #0006; }
  .metadata-sheet-heading { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border); }
  .metadata-sheet-heading > div { min-width: 0; }
  :global(.metadata-sheet .dialog-title) { margin: 0; font-size: 14px; font-weight: 550; }
  :global(.metadata-sheet .metadata-sheet-description) { margin: 4px 0 0; color: var(--muted); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  :global(.metadata-sheet-close) { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--muted); }
  :global(.metadata-sheet-trigger:hover),:global(.metadata-sheet-close:hover) { background: var(--raised); }
  :global(.metadata-sheet-trigger:focus-visible),:global(.metadata-sheet-close:focus-visible) { outline: 1px solid var(--accent); outline-offset: 2px; }
  .metadata-sheet-body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  @media(max-width: 760px) {
    :global(.metadata-sheet-trigger) { display: inline-flex; }
    :global(.metadata-sheet) { width: 100%; border-radius: 12px 12px 0 0; padding-bottom: env(safe-area-inset-bottom); }
  }
  @media(pointer: coarse) { :global(.metadata-sheet-trigger),:global(.metadata-sheet-close) { min-width: 44px; min-height: 44px; } }
</style>
