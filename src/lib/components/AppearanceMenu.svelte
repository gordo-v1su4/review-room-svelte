<script lang="ts" module>
  export type { AppearanceValue } from '$lib/appearance';
</script>

<script lang="ts">
  import { Popover } from 'bits-ui';
  import { LayoutGrid, X, ArrowUp, ArrowDown } from 'lucide-svelte';

  import { CARD_FIELD_DEFINITIONS, normalizeAppearance, type AppearanceValue, type CardFieldId } from '$lib/appearance';

  let { value, onChange }: {
    value: AppearanceValue;
    onChange: (value: AppearanceValue) => void;
  } = $props();

  let search = $state('');
  let announcement = $state('');
  const preferences = $derived(normalizeAppearance(value));
  const fields = $derived(preferences.fieldOrder.map(id => CARD_FIELD_DEFINITIONS.find(field => field.id === id)!).filter(field => field.label.toLowerCase().includes(search.trim().toLowerCase())));
  function toggleField(id: CardFieldId) {
    const visibleFields = preferences.visibleFields.includes(id) ? preferences.visibleFields.filter(field => field !== id) : [...preferences.visibleFields, id];
    onChange({ ...preferences, visibleFields });
  }
  function moveField(id: CardFieldId, direction: -1 | 1) {
    const fieldOrder = [...preferences.fieldOrder];
    const index = fieldOrder.indexOf(id), target = index + direction;
    if (target < 0 || target >= fieldOrder.length) return;
    [fieldOrder[index], fieldOrder[target]] = [fieldOrder[target], fieldOrder[index]];
    onChange({ ...preferences, fieldOrder });
    announcement = `${CARD_FIELD_DEFINITIONS.find(field => field.id === id)?.label} moved to position ${target + 1}`;
  }

  const aspects = [
    { value: 'square', label: 'Square', ratio: '1:1' },
    { value: 'landscape', label: 'Landscape', ratio: '16:9' },
    { value: 'portrait', label: 'Portrait', ratio: '9:16' }
  ] as const;
  const sizes = ['small', 'medium', 'large'] as const;
</script>

<Popover.Root>
  <Popover.Trigger class="secondary-button appearance-trigger explorer-tool" aria-label="Appearance" title="Appearance"><LayoutGrid size={14}/><span class="explorer-tool-label">Appearance</span></Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="appearance-popover" sideOffset={8} align="end" collisionPadding={12} aria-label="Appearance">
      <div class="appearance-heading"><h3>Appearance</h3><Popover.Close class="appearance-close" aria-label="Close appearance"><X size={15}/></Popover.Close></div>
      <fieldset>
        <legend>Card aspect</legend>
        <div class="appearance-options">
          {#each aspects as aspect (aspect.value)}
            <button type="button" class="appearance-option aspect-option" aria-pressed={preferences.aspect === aspect.value} aria-label={`${aspect.label} ${aspect.ratio}`} onclick={() => onChange({ ...preferences, aspect: aspect.value })}>
              <span class="ratio-frame" class:landscape={aspect.value === 'landscape'} class:portrait={aspect.value === 'portrait'} aria-hidden="true"></span>
              <span>{aspect.ratio}</span>
            </button>
          {/each}
        </div>
      </fieldset>
      <fieldset>
        <legend>Thumbnail scaling</legend>
        <div class="appearance-options">
          <button type="button" class="appearance-option" aria-pressed={preferences.fit === 'fit'} onclick={() => onChange({ ...preferences, fit: 'fit' })}>Fit</button>
          <button type="button" class="appearance-option" aria-pressed={preferences.fit === 'fill'} onclick={() => onChange({ ...preferences, fit: 'fill' })}>Fill</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Card size</legend>
        <div class="appearance-options">
          {#each sizes as size (size)}<button type="button" class="appearance-option size-option" aria-pressed={preferences.size === size} onclick={() => onChange({ ...preferences, size })}>{size}</button>{/each}
        </div>
      </fieldset>
      <label class="info-toggle"><span>Show card info</span><input type="checkbox" role="switch" checked={preferences.showInfo} onchange={event => onChange({ ...preferences, showInfo: event.currentTarget.checked })}/></label>
      <details class="fields-disclosure">
        <summary>Card fields <span>{preferences.visibleFields.length} visible</span></summary>
        <input class="field-search" type="search" aria-label="Search card fields" placeholder="Find a field…" bind:value={search}/>
        <div class="field-list">
          {#each fields as field (field.id)}
            {@const index = preferences.fieldOrder.indexOf(field.id)}
            <div class="field-row">
              <label class="field-toggle"><input type="checkbox" checked={preferences.visibleFields.includes(field.id)} onchange={() => toggleField(field.id)}/><span>{field.label}</span></label>
              <button type="button" class="field-move" aria-label={`Move ${field.label} up`} disabled={index === 0} onclick={() => moveField(field.id, -1)}><ArrowUp size={12}/></button>
              <button type="button" class="field-move" aria-label={`Move ${field.label} down`} disabled={index === preferences.fieldOrder.length - 1} onclick={() => moveField(field.id, 1)}><ArrowDown size={12}/></button>
            </div>
          {:else}<p class="field-note">No matching fields.</p>{/each}
        </div>
        <p class="field-note">Unavailable metadata appears as —.</p>
      </details>
      <span class="visually-hidden" role="status">{announcement}</span>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  .info-toggle { display: flex; justify-content: space-between; align-items: center; min-height: 32px; gap: 10px; font-size: 11px; }
  input[type='checkbox'] { accent-color: var(--teal); }
  .fields-disclosure { border-top: 1px solid var(--border); margin-top: 8px; padding-top: 10px; }
  summary { cursor: pointer; font-size: 11px; min-height: 28px; }
  summary span { float: right; color: var(--muted); }
  .field-search { width: 100%; min-height: 32px; padding: 6px 8px; background: var(--canvas); border: 1px solid var(--border); border-radius: 6px; font-size: 12px; margin-bottom: 8px; }
  .field-list { max-height: 200px; overflow-y: auto; }
  .field-row { display: flex; align-items: center; gap: 3px; }
  .field-toggle { display: flex; flex: 1; min-width: 0; align-items: center; gap: 7px; min-height: 30px; font-size: 11px; }
  .field-move { display: grid; place-items: center; width: 28px; min-height: 28px; border-radius: 5px; background: transparent; color: var(--muted); }
  .field-move:hover:not(:disabled) { color: var(--teal); background: var(--raised); }
  .field-note { font-size: 10px; color: var(--muted); margin-top: 8px; }
  @media (pointer: coarse), (max-width: 760px) { .field-move { width: 44px; min-height: 44px; } .field-toggle, .info-toggle, summary { min-height: 44px; } .field-search { min-height: 44px; font-size: 16px; } }
  :global(.appearance-trigger) { white-space: nowrap; }
  :global(.appearance-popover) { z-index: 60; width: min(280px, calc(100vw - 24px)); padding: 14px; max-height: min(640px, calc(100dvh - 32px)); overflow-y: auto; border: 1px solid var(--border); border-radius: 12px; color: var(--ink); background: var(--panel); box-shadow: 0 12px 36px #0006, inset 0 1px 0 #ffffff05; }
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
