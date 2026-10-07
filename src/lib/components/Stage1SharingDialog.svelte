<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { X } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import type { FunctionReturnType } from 'convex/server';
  import { internal } from '../../../convex/_generated/api';
  import Stage1Controls from './Stage1Controls.svelte';

  type Snapshot = FunctionReturnType<typeof internal.personal.snapshot>;
  let { snapshot, destinationContext, uploadContext, onVersionFile }: { snapshot: Snapshot; onVersionFile?: (file: File, projectId: string, assetId: string) => void; destinationContext?: {projectId:string;folderId:string|null;selectedVersionIds:string[]}; uploadContext?: {folders:readonly {id:string;title:string}[];folderId:string|null;assetClass:'VID'|'IMG'|'CTX'|'STB';onChange:(value:{folderId:string|null;assetClass:'VID'|'IMG'|'CTX'|'STB'})=>void;onChoose:()=>void} } = $props();
  let open = $state(false);
  onMount(() => { open = new URLSearchParams(location.search).get('sharing') === '1'; });
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger class="secondary-button">Publish &amp; share</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="filter-sheet publishing-sheet stage-one-sheet">
      <div class="stage-one-heading sheet-heading">
        <div><Dialog.Title class="dialog-title">Publish &amp; share</Dialog.Title><Dialog.Description>Private reviews and optional published embeds</Dialog.Description></div>
        <Dialog.Close class="publishing-close" aria-label="Close publishing tools"><X size={17} /></Dialog.Close>
      </div>
      <Stage1Controls {snapshot} onVersionFile={onVersionFile ? (file, projectId, assetId) => { open = false; onVersionFile?.(file, projectId, assetId); } : undefined} destinationContext={open ? destinationContext : undefined} uploadContext={uploadContext ? {...uploadContext,onChoose:() => { open = false; uploadContext?.onChoose(); }} : undefined} />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(body .stage-one-sheet) { width:min(480px,calc(100vw - 28px));height:min(650px,calc(100dvh - 28px));overflow:auto;padding:18px;background:color-mix(in srgb,var(--raised) 68%,transparent);backdrop-filter:blur(18px);border-color:var(--border);border-radius:10px;box-shadow:inset 0 1px #d3eee609,0 16px 50px #0006; }
  .stage-one-heading { display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:8px; }
  .stage-one-heading :global(.dialog-title) { margin:0;font-size:15px;font-weight:550; }
  .stage-one-heading :global([data-dialog-description]) { font-size:11px; }
  :global(.publishing-close) { display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:5px;color:var(--muted);background:transparent;cursor:pointer; }
  :global(.publishing-close:hover) { color:var(--ink);background:var(--raised); }
  :global(.publishing-close:focus-visible) { outline:1px solid var(--accent);outline-offset:2px; }
  @media(max-width:760px) { :global(body .stage-one-sheet) { width:100%;border-radius:12px 12px 0 0;padding-bottom:max(18px,env(safe-area-inset-bottom)); } }
  @media(pointer:coarse) { :global(.publishing-close) { min-width:44px;min-height:44px; } }
</style>

