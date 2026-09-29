<script lang="ts">
  import { Popover } from 'bits-ui';
  import { Repeat, ListVideo, Play, Check } from 'lucide-svelte';
  import type { ReviewPlaybackMode } from '$lib/playback/review-order';

  let { mode, onChange, disabled = false }: {
    mode: ReviewPlaybackMode;
    onChange: (mode: ReviewPlaybackMode) => void;
    disabled?: boolean;
  } = $props();
  let open = $state(false);
  const options = [
    { value: 'once', label: 'Play once', hint: 'Stop when this clip ends.' },
    { value: 'loop', label: 'Loop clip', hint: 'Repeat the current clip.' },
    { value: 'order', label: 'Play in order', hint: 'Follow visible media, then wrap. Images pause playback.' },
  ] as const;
  const selected = $derived(options.find(option => option.value === mode)!);
</script>

<Popover.Root bind:open>
  <Popover.Trigger class="secondary-button playback-mode" {disabled} aria-label={`Playback mode: ${selected.label}`} title={disabled ? 'Shortlist preview controls playback' : selected.hint}>
    {#if mode === 'loop'}<Repeat size={14}/>{:else if mode === 'order'}<ListVideo size={14}/>{:else}<Play size={14}/>{/if}
    <span>{mode === 'order' ? 'Order' : mode === 'loop' ? 'Loop' : 'Once'}</span>
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="playback-mode-menu" align="end" sideOffset={6} collisionPadding={12} aria-label="Review playback">
      {#each options as option (option.value)}
        <button type="button" aria-pressed={mode === option.value} onclick={() => { onChange(option.value); open = false; }}>
          <span class="choice-mark">{#if mode === option.value}<Check size={13}/>{/if}</span>
          <span><strong>{option.label}</strong><small>{option.hint}</small></span>
        </button>
      {/each}
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  :global(.playback-mode) { flex-shrink: 0; min-height: 28px; gap: 5px; padding: 0 7px; font-size: 10px; }
  :global(.playback-mode-menu) { z-index: 80; width: min(252px, calc(100vw - 24px)); padding: 5px; border: 1px solid var(--control-border); border-radius: 7px; background: var(--panel); box-shadow: inset 0 1px var(--control-edge-light), 0 12px 32px #0006; }
  button { display: flex; align-items: center; gap: 7px; width: 100%; min-height: 42px; padding: 7px; border: 0; border-radius: 4px; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
  button:hover, button[aria-pressed='true'] { background: var(--raised); }
  .choice-mark { width: 14px; flex-shrink: 0; color: var(--teal); }
  strong { display: block; font-size: 11px; font-weight: 550; }
  small { display: block; margin-top: 3px; font-size: 10px; line-height: 1.45; color: var(--muted); }
  @media (pointer: coarse) { :global(.playback-mode), button { min-height: 44px; } }
</style>
