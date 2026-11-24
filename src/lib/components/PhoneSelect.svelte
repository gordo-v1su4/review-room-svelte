<script lang="ts">
  import { Select } from 'bits-ui';
  import { ChevronDown } from 'lucide-svelte';

  let {
    name,
    id,
    label,
    items,
    placeholder = 'Choose an option',
    required = false,
    disabled = false,
    triggerClass = '',
    status,
    onValueChange,
    multiple = false,
    values = $bindable([]),
    onValuesChange,
    value = $bindable('')
  }: {
    name?: string;
    id?: string;
    label: string;
    items: { value: string; label: string; disabled?: boolean }[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    triggerClass?: string;
    status?: string;
    onValueChange?: (value: string) => void;
    multiple?: boolean;
    values?: string[];
    onValuesChange?: (values: string[]) => void;
    value?: string;
  } = $props();

  const selectedLabel = $derived(items.find((item) => item.value === value)?.label ?? placeholder);
  const selectedLabels = $derived(items.filter(item => values.includes(item.value)).map(item => item.label).join(', ') || placeholder);
</script>

{#snippet controls(display: string)}
  <Select.Trigger {id} class={`phone-select-trigger ${triggerClass}`} data-status={status} aria-label={label} title={display}>
    <span>{display}</span><ChevronDown size={14} aria-hidden="true" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content class="phone-select-content" sideOffset={4}>
      <Select.Viewport>
        {#each items as item (item.value)}
          <Select.Item class="phone-select-item" value={item.value} label={item.label} disabled={item.disabled}>{item.label}</Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
{/snippet}
{#if multiple}
  <Select.Root type="multiple" bind:value={values} {name} {required} {items} {disabled} onValueChange={onValuesChange}>
    {@render controls(selectedLabels)}
  </Select.Root>
{:else}
  <Select.Root type="single" bind:value {name} {required} {items} {disabled} {onValueChange}>
    {@render controls(selectedLabel)}
  </Select.Root>
{/if}

<style>
  :global(.phone-select-trigger) { display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;height:28px;padding:0 9px;border:1px solid var(--border);border-radius:5px;background:var(--canvas);color:var(--ink);font:inherit;font-size:11px;text-align:left; }
  :global(.phone-select-trigger:disabled) { opacity:.45;cursor:default; }
  :global(.phone-select-trigger span) { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  :global(.phone-select-trigger svg) { flex:none;color:var(--muted); }
  :global(.phone-select-trigger:focus-visible) { outline:1px solid var(--accent);outline-offset:2px; }
  :global(.phone-select-content) { box-sizing:border-box;z-index:110;min-width:min(var(--bits-select-anchor-width),calc(100vw - 32px));max-width:calc(100vw - 32px);max-height:min(280px,var(--bits-select-content-available-height));overflow-y:auto;overflow-x:hidden;padding:4px;border:1px solid var(--border);border-radius:5px;background:color-mix(in srgb,var(--raised) 70%,transparent);backdrop-filter:blur(18px);box-shadow:0 10px 30px #0008; }
  :global(.phone-select-item) { display:flex;align-items:center;min-height:28px;padding:0 9px;border-radius:3px;color:var(--ink);font-size:11px;outline:none;cursor:pointer;white-space:normal;overflow-wrap:anywhere; }
  :global(.phone-select-item[data-highlighted]),:global(.phone-select-item[data-state='checked']) { background:color-mix(in srgb,var(--accent) 20%,var(--panel));color:var(--ink); }
  :global(.phone-select-item[data-disabled]) { opacity:.45;cursor:default; }
</style>
