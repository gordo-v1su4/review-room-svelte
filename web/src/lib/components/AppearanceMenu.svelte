<script lang="ts" module>
  export type AppearanceValue = {
    aspect: 'square' | 'landscape' | 'portrait';
    fit: 'fit' | 'fill';
    size: 'small' | 'medium' | 'large';
  };
</script>

<script lang="ts">
  import { Popover } from 'bits-ui';
  import { LayoutGrid, X } from 'lucide-svelte';

  let { value, onChange }: {
    value: AppearanceValue;
    onChange: (value: AppearanceValue) => void;
  } = $props();

  const aspects = [
    { value: 'square', label: 'Square', ratio: '1:1' },
    { value: 'landscape', label: 'Landscape', ratio: '16:9' },
    { value: 'portrait', label: 'Portrait', ratio: '9:16' }
  ] as const;
  const sizes = ['small', 'medium', 'large'] as const;
</script>

<Popover.Root>
  <Popover.Trigger class="secondary-button appearance-trigger"><LayoutGrid size={14}/> Appearance</Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="appearance-popover" sideOffset={8} align="end" collisionPadding={12} aria-label="Appearance">
      <div class="appearance-heading"><h3>Appearance</h3><Popover.Close class="appearance-close" aria-label="Close appearance"><X size={15}/></Popover.Close></div>
      <fieldset>
        <legend>Card aspect</legend>
        <div class="appearance-options">
          {#each aspects as aspect}
            <button type="button" class="appearance-option aspect-option" aria-pressed={value.aspect === aspect.value} aria-label={`${aspect.label} ${aspect.ratio}`} onclick={() => onChange({ ...value, aspect: aspect.value })}>
              <span class="ratio-frame" class:landscape={aspect.value === 'landscape'} class:portrait={aspect.value === 'portrait'} aria-hidden="true"></span>
              <span>{aspect.ratio}</span>
            </button>
          {/each}
        </div>
      </fieldset>
      <fieldset>
        <legend>Thumbnail scaling</legend>
        <div class="appearance-options">
          <button type="button" class="appearance-option" aria-pressed={value.fit === 'fit'} onclick={() => onChange({ ...value, fit: 'fit' })}>Fit</button>
          <button type="button" class="appearance-option" aria-pressed={value.fit === 'fill'} onclick={() => onChange({ ...value, fit: 'fill' })}>Fill</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Card size</legend>
        <div class="appearance-options">
          {#each sizes as size}<button type="button" class="appearance-option size-option" aria-pressed={value.size === size} onclick={() => onChange({ ...value, size })}>{size}</button>{/each}
        </div>
      </fieldset>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  :global(.appearance-trigger) { white-space: nowrap; }
  :global(.appearance-popover) { z-index: 60; width: min(280px, calc(100vw - 24px)); padding: 14px; border: 1px solid var(--border); border-radius: 12px; color: var(--ink); background: var(--panel); box-shadow: 0 12px 36px #0006, inset 0 1px 0 #ffffff05; }
  .appearance-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  h3 { font-size: 12px; font-weight: 500; }
  :global(.appearance-close) { display: grid; place-items: center; min-width: 28px; min-height: 28px; border-radius: 5px; background: transparent; color: var(--muted); }
  fieldset { border: 0; padding: 0; margin: 0 0 14px; min-width: 0; }
  fieldset:last-child { margin-bottom: 0; }
  legend { margin-bottom: 7px; font-size: 11px; color: var(--muted); }
  .appearance-options { display: flex; gap: 5px; }
  .appearance-option { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 30px; padding: 5px; border: 1px solid var(--border); border-radius: 6px; background: var(--canvas); color: var(--muted); font-size: 11px; }
  .appearance-option:hover { background: var(--raised); color: var(--ink); }
  .appearance-option[aria-pressed='true'] { color: var(--teal); border-color: var(--accent); background: var(--raised); }
  .size-option { text-transform: capitalize; }
  .aspect-option { min-height: 42px; }
  .ratio-frame { width: 15px; height: 15px; border: 1px solid currentColor; border-radius: 2px; }
  .ratio-frame.landscape { width: 20px; height: 12px; }
  .ratio-frame.portrait { width: 11px; height: 19px; }
  @media (pointer: coarse), (max-width: 760px) { .appearance-option, :global(.appearance-close) { min-height: 44px; min-width: 44px; } }
</style>
