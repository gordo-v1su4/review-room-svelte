<script lang="ts">
  import { Popover } from 'bits-ui';
  import { Check, Files, RotateCcw, X } from 'lucide-svelte';
  import type { ImportJob } from '$lib/import-queue';

  let { jobs, onRetry, onCancel, onClear }: {
    jobs: readonly ImportJob[];
    onRetry: (id: string) => void;
    onCancel: (id: string) => void;
    onClear: () => void;
  } = $props();

  const ready = $derived(jobs.filter(job => job.status === 'ready').length);
  const failures = $derived(jobs.filter(job => job.status === 'failed').length);
  const finished = $derived(jobs.some(job => ['ready', 'cancelled'].includes(job.status)));
  const labels: Record<ImportJob['status'], string> = {
    queued: 'Queued', preparing: 'Preparing', ready: 'Ready', failed: 'Failed', cancelled: 'Cancelled',
  };
</script>

<span class="queue-announcement" role="status" aria-live="polite" aria-atomic="true">{failures > 0 ? `${failures} ${failures === 1 ? 'import failed' : 'imports failed'}. Open Imports to retry.` : ''}</span>
{#if jobs.length > 0}
  <Popover.Root>
    <Popover.Trigger class="import-queue-trigger" aria-label={`Imports: ${ready} of ${jobs.length} ready`}>
      <Files size={14} aria-hidden="true"/><span>Imports</span><span class="queue-count">{ready}/{jobs.length}</span>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content class="import-queue-popover" aria-label="Import queue" align="end" sideOffset={6} collisionPadding={12}>
        <header class="queue-heading">
          <h2>Imports <span>{ready} of {jobs.length} ready</span></h2>
          <Popover.Close class="import-queue-close" aria-label="Close import queue"><X size={15} aria-hidden="true"/></Popover.Close>
        </header>
        <ul class="queue-list" aria-label="Imported files">
          {#each jobs as job (job.id)}
            <li class="queue-row" data-status={job.status}>
              <div class="queue-file">
                <strong title={job.file.name}>{job.file.name}</strong>
                <span class="queue-destination" title={job.destinationLabel}>{job.destinationLabel}</span>
              </div>
              <span class="queue-state">{#if job.status === 'ready'}<Check size={12} aria-hidden="true"/>{/if}{labels[job.status]}</span>
              {#if job.status === 'queued' || job.status === 'preparing'}
                <button type="button" class="queue-action" aria-label={`Cancel import ${job.file.name}`} onclick={() => onCancel(job.id)}>Cancel</button>
              {:else if job.status === 'failed' || job.status === 'cancelled'}
                <button type="button" class="queue-action" aria-label={`Retry import ${job.file.name}`} onclick={() => onRetry(job.id)}><RotateCcw size={12} aria-hidden="true"/>Retry</button>
              {/if}
              {#if job.status === 'failed' && job.error}<p class="queue-error">{job.error}</p>{/if}
            </li>
          {/each}
        </ul>
        <footer class="queue-footer">
          <p>Local to this tab. Files aren’t uploaded.</p>
          <button type="button" class="queue-action" disabled={!finished} onclick={onClear}>Clear finished</button>
        </footer>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
{/if}

<style>
  .queue-announcement { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  :global(.import-queue-trigger) { display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex-shrink: 0; height: 28px; min-height: 28px; padding: 0 8px; border: 1px solid var(--border); border-radius: 5px; background: var(--panel); color: var(--ink); font: inherit; font-size: 11px; cursor: pointer; }
  :global(.import-queue-trigger:hover), :global(.import-queue-trigger[data-state='open']) { background: color-mix(in srgb, var(--accent) 8%, var(--panel)); }
  .queue-count { color: var(--muted); font-variant-numeric: tabular-nums; }
  :global(.import-queue-popover) { box-sizing: border-box; z-index: 80; width: min(400px, calc(100vw - 24px)); max-height: min(var(--bits-popover-content-available-height), calc(100dvh - 24px)); overflow-y: auto; padding: 12px; border: 1px solid var(--border); border-radius: 7px; background: var(--panel); color: var(--ink); box-shadow: 0 10px 36px #0006; outline: none; }
  .queue-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
  h2 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin: 0; font-size: 12px; font-weight: 550; }
  h2 span { color: var(--muted); font-size: 10px; font-weight: 400; font-variant-numeric: tabular-nums; }
  :global(.import-queue-close) { display: grid; place-items: center; width: 28px; height: 28px; min-height: 28px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: var(--muted); cursor: pointer; }
  :global(.import-queue-close:hover) { background: var(--canvas); color: var(--ink); }
  .queue-list { margin: 0; padding: 0; list-style: none; }
  .queue-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 4px 8px; padding: 10px 0; border-top: 1px solid var(--border); }
  .queue-file { display: grid; gap: 4px; min-width: 0; }
  .queue-file strong, .queue-destination { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .queue-file strong { font-size: 11px; font-weight: 500; }
  .queue-destination { color: var(--muted); font-size: 10px; }
  .queue-state { display: inline-flex; align-items: center; gap: 3px; color: var(--muted); font-size: 10px; }
  .queue-row[data-status='ready'] .queue-state { color: var(--status-approved, #77d8b5); }
  .queue-row[data-status='failed'] .queue-state, .queue-error { color: var(--status-needs-changes, #f09c93); }
  .queue-row[data-status='preparing'] .queue-state { color: var(--teal); }
  .queue-action { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-height: 28px; height: 28px; padding: 0 7px; border: 1px solid var(--border); border-radius: 4px; background: transparent; color: var(--ink); font: inherit; font-size: 10px; cursor: pointer; white-space: nowrap; }
  .queue-action:hover:not(:disabled) { background: var(--canvas); }
  .queue-action:disabled { opacity: .4; cursor: default; }
  .queue-error { grid-column: 1 / -1; margin: 3px 0 0; font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }
  .queue-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 10px; border-top: 1px solid var(--border); }
  .queue-footer p { margin: 0; color: var(--muted); font-size: 10px; line-height: 1.5; }
  :global(.import-queue-trigger:focus-visible), :global(.import-queue-close:focus-visible), .queue-action:focus-visible { outline: 1px solid var(--accent); outline-offset: 2px; }
  @media (pointer: coarse) {
    :global(.import-queue-trigger), :global(.import-queue-close), .queue-action { height: 44px; min-height: 44px; }
    :global(.import-queue-close) { width: 44px; }
    .queue-action { min-width: 44px; }
  }
</style>
