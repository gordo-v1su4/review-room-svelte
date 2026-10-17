<script lang="ts">
  import { Popover } from 'bits-ui';
  import { Info, X } from 'lucide-svelte';
  import { deliverableKinds } from '../../../convex/lib/shotCode';

  const parts = [
    { sample: 'BLR', label: 'Show' },
    { sample: 'EP101', label: 'Episode · EP101 = season 1, episode 01' },
    { sample: 'PAR', label: 'Scene code' },
    { sample: '0020', label: 'Shot · numbered in steps of 10' },
    { sample: 'v003', label: 'Version · each take is the next version' },
  ];
</script>

<Popover.Root>
  <Popover.Trigger class="code-legend-trigger" aria-label="Code legend" title="Code legend"><Info size={12}/><span>Codes</span></Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="code-legend" sideOffset={6} align="start" collisionPadding={12} aria-label="Code legend">
      <div class="code-legend-heading"><h3>Production codes</h3><Popover.Close class="code-legend-close" aria-label="Close code legend"><X size={14}/></Popover.Close></div>
      <p class="code-sample">BLR_EP101_PAR_0020 <span>v003</span></p>
      <dl>{#each parts as part (part.sample)}<dt>{part.sample}</dt><dd>{part.label}</dd>{/each}</dl>
      <h4>Deliverables</h4>
      <p class="code-sample">BLR_EP101_EPC · BLR_S1_TRL01</p>
      <dl>{#each Object.entries(deliverableKinds) as [kind, label] (kind)}<dt>{kind}</dt><dd>{label}</dd>{/each}<dt>S1</dt><dd>Season-level deliverable</dd></dl>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  :global(.code-legend-trigger) { display: inline-flex; align-items: center; gap: 4px; padding: 1px 6px; border: 1px solid var(--border); border-radius: 5px; background: transparent; color: var(--muted); font: inherit; font-size: 11px; cursor: pointer; }
  :global(.code-legend-trigger:hover) { color: var(--ink); background: var(--raised); }
  :global(.code-legend-trigger:focus-visible) { outline: 1px solid var(--focus-ring); outline-offset: 1px; }
  :global(.code-legend) { z-index: 60; width: min(300px, calc(100vw - 24px)); padding: 12px 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--panel); color: var(--ink); box-shadow: 0 16px 50px #0008; font-size: 12px; }
  .code-legend-heading { display: flex; align-items: center; justify-content: space-between; }
  h3 { margin: 0; font-size: 13px; font-weight: 560; }
  h4 { margin: 12px 0 0; color: var(--muted); font-size: 10px; font-weight: 650; letter-spacing: .1em; text-transform: uppercase; }
  :global(.code-legend-close) { display: grid; place-items: center; width: 22px; height: 22px; border: 0; border-radius: 4px; background: transparent; color: var(--muted); }
  .code-sample { margin: 8px 0 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: var(--teal); }
  .code-sample span { color: var(--muted); }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 3px 10px; margin: 0; }
  dt { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--ink); }
  dd { margin: 0; color: var(--muted); }
</style>
