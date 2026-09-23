<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { UserRound, X } from 'lucide-svelte';
  import AccountPanel from './AccountPanel.svelte';
  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger class="account-trigger avatar small" aria-label="Account" title="Account"><UserRound size={14}/></Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay"/>
    <Dialog.Content class="filter-sheet account-sheet">
      <div class="sheet-heading"><Dialog.Title class="dialog-title">Account</Dialog.Title><Dialog.Close class="account-close" aria-label="Close account"><X size={16}/></Dialog.Close></div>
      <Dialog.Description>Connect to your Review Room workspace.</Dialog.Description>
      {#if open}<AccountPanel/>{/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.account-trigger) { display: inline-flex; align-items: center; justify-content: center; margin-left: auto; cursor: pointer; }
  :global(.account-sheet) { width: min(400px, calc(100vw - 28px)); padding: 18px; background: linear-gradient(155deg, var(--raised), var(--panel) 45%); border-color: var(--border); border-radius: 10px; }
  :global(.account-close) { display: inline-flex; justify-content: center; align-items: center; width: 28px; height: 28px; padding: 0; color: var(--muted); background: transparent; border: 0; }
  :global(.account-trigger:focus-visible),:global(.account-close:focus-visible) { outline: 1px solid var(--focus-ring); outline-offset: 2px; }
  @media (max-width: 760px) { :global(.account-sheet) { width: 100%; border-radius: 10px 10px 0 0; padding-bottom: max(18px, env(safe-area-inset-bottom)); } }
  @media (pointer: coarse) { :global(.account-trigger),:global(.account-close) { min-width: 44px; min-height: 44px; } }
</style>
