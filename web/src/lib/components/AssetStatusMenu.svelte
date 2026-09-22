<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import { Check, ChevronDown } from 'lucide-svelte';
  import type { VideoStatus } from '../../../../src/lib/types';
  import type { ReviewAccess } from '$lib/review-session';
  import { selectionPermissions } from '$lib/media-selection';
  let { status, name, access, onChange }: { status: VideoStatus; name: string; access: ReviewAccess; onChange: (status: VideoStatus) => void } = $props();
  const allowed = $derived(selectionPermissions(access).statuses);
  const labels: Record<VideoStatus, string> = { not_started: 'Not started', in_progress: 'In progress', awaiting_review: 'Awaiting review', needs_changes: 'Needs changes', approved: 'Approved', final: 'Final', omitted: 'Omitted', archived: 'Archived' };
  let error = $state('');
  function choose(value: string) {
    const next = allowed.find(item => item === value);
    if (!next) return;
    try { onChange(next); error = ''; }
    catch (cause) { error = cause instanceof Error ? cause.message : 'Could not change status.'; }
  }
</script>
<DropdownMenu.Root>
  <DropdownMenu.Trigger class="asset-status-trigger" data-status={status} disabled={!allowed.length || status === 'archived'} aria-label={`Change status for ${name}: ${labels[status]}`}>
    <span class="status-mark" aria-hidden="true"></span><span>{labels[status]}</span>{#if allowed.length && status !== 'archived'}<ChevronDown size={11}/>{/if}
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal><DropdownMenu.Content class="asset-status-menu" sideOffset={5} align="start" collisionPadding={10} aria-label={`Status for ${name}`}>
    <DropdownMenu.RadioGroup value={status} onValueChange={choose}>
      {#each allowed as value (value)}<DropdownMenu.RadioItem class="asset-status-option" {value}><span>{labels[value]}</span>{#if status === value}<Check size={13}/>{/if}</DropdownMenu.RadioItem>{/each}
    </DropdownMenu.RadioGroup>
  </DropdownMenu.Content></DropdownMenu.Portal>
</DropdownMenu.Root>
{#if error}<span class="status-error" role="alert">{error}</span>{/if}
<style>
  :global(.asset-status-trigger) { display: inline-flex; align-items: center; gap: 5px; max-width: 100%; min-height: 24px; padding: 2px 4px; margin-left: -4px; color: var(--muted); font: inherit; background: transparent; border-radius: 4px; white-space: nowrap; cursor: pointer; }
  :global(.asset-status-trigger:hover:not(:disabled)) { background: var(--raised); color: var(--ink); }
  :global(.asset-status-trigger:disabled) { cursor: default; }
  :global(.asset-status-trigger:focus-visible) { outline: 1px solid var(--accent); outline-offset: 2px; }
  .status-mark { width: 5px; height: 5px; border-radius: 1px; background: currentColor; flex-shrink: 0; }
  :global(.asset-status-trigger[data-status='approved']), :global(.asset-status-trigger[data-status='final']) { color: var(--teal); }
  :global(.asset-status-menu) { z-index: 80; min-width: 180px; padding: 4px; border: 1px solid var(--border); border-radius: 7px; background: var(--panel); box-shadow: 0 12px 32px #0008; }
  :global(.asset-status-option) { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 30px; padding: 0 8px; border-radius: 4px; color: var(--ink); font-size: 11px; cursor: pointer; outline: none; }
  :global(.asset-status-option[data-highlighted]) { background: var(--raised); }
  :global(.asset-status-option[data-state='checked']) { color: var(--teal); }
  .status-error { color: #e6a2a2; white-space: normal; }
  @media (pointer: coarse) { :global(.asset-status-trigger), :global(.asset-status-option) { min-height: 44px; } }
</style>
