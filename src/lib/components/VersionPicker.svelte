<script lang="ts" module>
  export type VersionOption = { id: string; version: number; excluded: boolean };
</script>

<script lang="ts">
  import { Select } from 'bits-ui';
  import { ChevronDown } from 'lucide-svelte';
  import { formatVersion } from '../../../convex/lib/shotCode';

  /**
   * Chooses which take of an asset is displayed. Choosing a take never changes the
   * saved current version (the pick); the current take and excluded takes are marked.
   */
  let { versions, value, currentId, label, compact = false, disabled = false, onChange }: {
    versions: readonly VersionOption[];
    value: string | undefined;
    currentId: string | undefined;
    label: string;
    compact?: boolean;
    disabled?: boolean;
    onChange: (versionId: string) => void;
  } = $props();

  const sorted = $derived([...versions].sort((a, b) => a.version - b.version));
  const selected = $derived(sorted.find(item => item.id === value));
  const items = $derived(sorted.map(item => ({ value: item.id, label: formatVersion(item.version) })));
  const isCurrent = $derived(!!selected && selected.id === currentId);
  const title = $derived(selected ? `${label}: ${formatVersion(selected.version)}${isCurrent ? ' · Current' : ''}${selected.excluded ? ' · Excluded' : ''}` : label);
</script>

<Select.Root type="single" value={value ?? ''} {items} disabled={disabled || sorted.length === 0} onValueChange={next => { if (next && next !== value) onChange(next); }}>
  <Select.Trigger class={compact ? 'version-picker-trigger compact' : 'version-picker-trigger'} aria-label={title} {title} data-current={isCurrent || undefined} data-excluded={selected?.excluded || undefined}>
    <span class="version-picker-value">{selected ? formatVersion(selected.version) : '—'}</span>
    {#if !compact && isCurrent}<span class="version-chip current">Current</span>{/if}
    {#if !compact && selected?.excluded}<span class="version-chip excluded">Excluded</span>{/if}
    {#if compact && isCurrent}<span class="version-dot" aria-hidden="true"></span>{/if}
    <ChevronDown size={compact ? 11 : 14} aria-hidden="true" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content class="version-picker-content" sideOffset={4} align="start">
      <Select.Viewport>
        {#each sorted as item (item.id)}
          <Select.Item class="version-picker-item" value={item.id} label={formatVersion(item.version)} data-current={item.id === currentId || undefined} data-excluded={item.excluded || undefined}>
            <span class="version-picker-number">{formatVersion(item.version)}</span>
            {#if item.id === currentId}<span class="version-chip current">Current</span>{/if}
            {#if item.excluded}<span class="version-chip excluded">Excluded</span>{/if}
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>

<style>
  :global(.version-picker-trigger) { display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 8px 0 9px;border:0;border-radius:5px;background:transparent;color:var(--ink);font:inherit;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap;cursor:pointer; }
  :global(.version-picker-trigger svg) { flex:none;color:var(--muted); }
  :global(.version-picker-trigger:hover:not(:disabled)) { background:var(--raised); }
  :global(.version-picker-trigger:focus-visible) { outline:1px solid var(--teal);outline-offset:2px; }
  :global(.version-picker-trigger:disabled) { opacity:.45;cursor:default; }
  :global(.version-picker-trigger.compact) { flex:none;gap:3px;height:18px;padding:0 3px 0 5px;border-color:transparent;border-radius:4px;background:transparent;color:var(--muted);font-size:10.5px;font-weight:500; }
  :global(.version-picker-trigger.compact:hover:not(:disabled)),:global(.version-picker-trigger.compact[data-state='open']) { border-color:var(--border);background:var(--raised);color:var(--ink); }
  :global(.version-picker-trigger.compact[data-current]) { color:var(--teal); }
  :global(.version-picker-trigger[data-excluded] .version-picker-value) { text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--muted) 70%,transparent); }
  :global(.version-dot) { width:5px;height:5px;border-radius:50%;background:var(--teal); }
  :global(.version-chip) { display:inline-flex;align-items:center;height:16px;padding:0 5px;border-radius:3px;font-size:9.5px;font-weight:600;letter-spacing:.02em;text-transform:uppercase; }
  :global(.version-chip.current) { background:color-mix(in srgb,var(--teal) 16%,transparent);color:var(--teal); }
  :global(.version-chip.excluded) { background:color-mix(in srgb,#8b7cf6 14%,transparent);color:#b3a8f8; }
  :global(.version-picker-content) { z-index:110;min-width:max(150px,var(--bits-select-anchor-width));max-height:min(300px,var(--bits-select-content-available-height));overflow:auto;padding:4px;border:1px solid var(--border);border-radius:5px;background:color-mix(in srgb,var(--raised) 70%,transparent);backdrop-filter:blur(18px);box-shadow:0 10px 30px #0008; }
  :global(.version-picker-item) { display:flex;align-items:center;gap:6px;min-height:28px;padding:0 9px;border-radius:3px;color:var(--ink);font-size:11px;font-variant-numeric:tabular-nums;outline:none;cursor:pointer; }
  :global(.version-picker-item .version-picker-number) { min-width:34px; }
  :global(.version-picker-item[data-excluded] .version-picker-number) { color:var(--muted);text-decoration:line-through; }
  :global(.version-picker-item[data-highlighted]) { background:color-mix(in srgb,var(--accent) 20%,var(--panel)); }
  :global(.version-picker-item[data-state='checked']) { background:color-mix(in srgb,var(--accent) 34%,var(--panel)); }
  @media(pointer:coarse) { :global(.version-picker-trigger:not(.compact)),:global(.version-picker-item) { min-height:44px;font-size:16px; } :global(.version-picker-trigger.compact) { height:28px;font-size:12px; } }
</style>
