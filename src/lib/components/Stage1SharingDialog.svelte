<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { X } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import type { FunctionReturnType } from 'convex/server';
  import { internal } from '../../../convex/_generated/api';
  import Stage1Controls from './Stage1Controls.svelte';

  type Snapshot = FunctionReturnType<typeof internal.personal.snapshot>;
  let { snapshot, destinationContext, uploadContext }: { snapshot: Snapshot; destinationContext?: {projectId:string;folderId:string|null;selectedVersionIds:string[]}; uploadContext?: {folders:readonly {id:string;title:string}[];folderId:string|null;assetClass:'VID'|'IMG'|'CTX'|'STB';onChange:(value:{folderId:string|null;assetClass:'VID'|'IMG'|'CTX'|'STB'})=>void;onChoose:()=>void} } = $props();
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
      <Stage1Controls {snapshot} destinationContext={open ? destinationContext : undefined} uploadContext={uploadContext ? {...uploadContext,onChoose:() => { open = false; uploadContext?.onChoose(); }} : undefined} />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .stage-one-heading { display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:8px; }
  .stage-one-heading :global(.dialog-title) { margin:0;font-size:15px;font-weight:550; }
  .stage-one-heading :global([data-dialog-description]) { font-size:11px; }
</style>
