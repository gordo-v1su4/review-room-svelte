<script lang="ts">
  import { Select } from 'bits-ui';
  import { ChevronDown } from 'lucide-svelte';

  let {
    name,
    label,
    items,
    placeholder = 'Choose an option',
    required = false,
    value = $bindable('')
  }: {
    name?: string;
    label: string;
    items: { value: string; label: string }[];
    placeholder?: string;
    required?: boolean;
    value?: string;
  } = $props();

  const selectedLabel = $derived(items.find((item) => item.value === value)?.label ?? placeholder);
</script>

<Select.Root type="single" bind:value {name} {required} {items}>
  <Select.Trigger class="stage1-select-trigger" aria-label={label}>
    <span>{selectedLabel}</span><ChevronDown size={14} aria-hidden="true" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content class="stage1-select-content" sideOffset={4}>
      <Select.Viewport>
        {#each items as item (item.value)}
          <Select.Item class="stage1-select-item" value={item.value} label={item.label}>{item.label}</Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>

<style>
  :global(.stage1-select-trigger) { display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;height:34px;padding:0 9px;border:1px solid var(--border);border-radius:5px;background:var(--canvas);color:var(--ink);font:inherit;font-size:12px;text-align:left; }
  :global(.stage1-select-trigger span) { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  :global(.stage1-select-trigger svg) { flex:none;color:var(--muted); }
  :global(.stage1-select-trigger:focus-visible) { outline:1px solid var(--accent);outline-offset:2px; }
  :global(.stage1-select-content) { z-index:110;min-width:var(--bits-select-anchor-width);max-height:min(280px,var(--bits-select-content-available-height));overflow:auto;padding:4px;border:1px solid var(--border);border-radius:5px;background:color-mix(in srgb,var(--raised) 70%,transparent);backdrop-filter:blur(18px);box-shadow:0 10px 30px #0008; }
  :global(.stage1-select-item) { display:flex;align-items:center;min-height:30px;padding:0 9px;border-radius:3px;color:var(--ink);font-size:12px;outline:none;cursor:pointer; }
  :global(.stage1-select-item[data-highlighted]),:global(.stage1-select-item[data-state='checked']) { background:color-mix(in srgb,var(--accent) 20%,var(--panel));color:var(--ink); }
  @media(pointer:coarse) { :global(.stage1-select-trigger),:global(.stage1-select-item) { min-height:44px;font-size:16px; } }
</style>
