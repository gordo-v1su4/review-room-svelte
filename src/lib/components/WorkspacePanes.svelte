<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { DEFAULT_PANE_SIZES, normalizePaneSizes, paneMinimums, resizePanePair, twoPaneSizes, type PaneSizes } from '$lib/workspace-panes';

  let { explorer, viewer, inspector, hasActive, showInspector = true, storageKey = 'review-room.workspace-panes' }: {
    explorer: Snippet;
    viewer: Snippet;
    inspector: Snippet;
    hasActive: boolean;
    showInspector?: boolean;
    storageKey?: string;
  } = $props();

  const uid = $props.id();
  let host: HTMLDivElement;
  let sizes = $state<PaneSizes>([...DEFAULT_PANE_SIZES]);
  let available = $state(1000);
  let drag: { pointer: number; divider: 0 | 1; startX: number; sizes: PaneSizes; node: HTMLElement } | undefined;
  let dragging = $state(false);
  let compactPercent = $state<number>();
  const contentWidth = $derived(available + (showInspector ? 0 : 8));
  const displayed = $derived(showInspector ? sizes : twoPaneSizes(compactPercent ?? sizes[0] / (sizes[0] + sizes[1]) * 100, contentWidth));
  const minimums = $derived(showInspector ? paneMinimums(available) : [220 / Math.max(540, contentWidth) * 100, 320 / Math.max(540, contentWidth) * 100, 0]);
  function applySize(divider: 0 | 1, target: number, source: PaneSizes = sizes) {
    if (showInspector) sizes = resizePanePair(source, divider, target, available);
    else compactPercent = twoPaneSizes(target, contentWidth)[0];
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(sizes)); } catch { /* Storage is optional. */ }
  }
  function release() {
    const previous = drag;
    drag = undefined; dragging = false;
    if (previous?.node.hasPointerCapture(previous.pointer)) previous.node.releasePointerCapture(previous.pointer);
  }
  function start(event: PointerEvent, divider: 0 | 1) {
    if (event.button !== 0 || !event.isPrimary || drag) return;
    const node = event.currentTarget as HTMLElement;
    node.focus();
    node.setPointerCapture(event.pointerId);
    drag = { pointer: event.pointerId, divider, startX: event.clientX, sizes: [...displayed], node };
    dragging = true;
    event.preventDefault();
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer) return;
    const target = drag.sizes[drag.divider] + (event.clientX - drag.startX) / contentWidth * 100;
    applySize(drag.divider, target, drag.sizes);
  }
  function finish(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (event.type === 'pointerup') move(event);
    release(); persist();
  }
  function keyboard(event: KeyboardEvent, divider: 0 | 1) {
    let target = displayed[divider];
    if (event.key === 'ArrowLeft') target -= event.shiftKey ? 5 : 1;
    else if (event.key === 'ArrowRight') target += event.shiftKey ? 5 : 1;
    else if (event.key === 'Home') target = minimums[divider];
    else if (event.key === 'End') target = displayed[divider] + displayed[divider + 1] - minimums[divider + 1];
    else return;
    event.preventDefault();
    applySize(divider, target); persist();
  }
  onMount(() => {
    available = Math.max(1, host.clientWidth - 16);
    const restoreWidth = host.clientWidth >= 796 && window.innerWidth >= 1100 ? available : 1000;
    try { sizes = normalizePaneSizes(JSON.parse(localStorage.getItem(storageKey) ?? 'null'), restoreWidth); } catch { sizes = normalizePaneSizes(DEFAULT_PANE_SIZES, restoreWidth); }
    const observer = new ResizeObserver(() => {
      const nextWidth = Math.max(1, host.clientWidth - 16);
      if (nextWidth === available) return;
      release();
      available = nextWidth;
      // Preserve desktop preferences while the responsive stack is showing.
      if (showInspector && host.clientWidth >= 796 && window.innerWidth >= 1100) sizes = normalizePaneSizes(sizes, available);
    });
    observer.observe(host);
    return () => { release(); observer.disconnect(); };
  });
</script>

<div class="pane-host" bind:this={host}>
  <div class="workspace-panes" class:has-active={hasActive} class:inspector-hidden={!showInspector} class:dragging style:--explorer-size={`${displayed[0]}fr`} style:--viewer-size={`${displayed[1]}fr`} style:--inspector-size={`${displayed[2]}fr`}>
    <section class="pane explorer-pane" id={`${uid}-explorer`} aria-label="Media explorer">{@render explorer()}</section>
    {#each [0, 1] as index (index)}
      {@const divider = index as 0 | 1}
      <!-- WAI-ARIA window splitter: focusable separator with range values and arrow-key controls. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
      <div
        class="pane-divider" class:first-divider={divider === 0} class:second-divider={divider === 1}
        role="separator" aria-orientation="vertical" tabindex="0"
        aria-label={divider === 0 ? 'Resize explorer and viewer' : 'Resize viewer and feedback'}
        aria-controls={divider === 0 ? `${uid}-explorer ${uid}-viewer` : `${uid}-viewer ${uid}-inspector`}
        aria-valuemin={Math.round(minimums[divider])}
        aria-valuemax={Math.round(displayed[divider] + displayed[divider + 1] - minimums[divider + 1])}
        aria-valuenow={Math.round(displayed[divider])}
        aria-valuetext={`${Math.round(displayed[divider])} percent`}
        onpointerdown={event => start(event, divider)} onpointermove={move}
        onpointerup={finish} onpointercancel={finish} onlostpointercapture={finish}
        onkeydown={event => keyboard(event, divider)}
      ><span></span></div>
    {/each}
    <section class="pane viewer-pane" id={`${uid}-viewer`} aria-label="Media viewer">{@render viewer()}</section>
    <section class="pane inspector-pane" id={`${uid}-inspector`} aria-label="Feedback inspector">{@render inspector()}</section>
  </div>
</div>

<style>
  .pane-host { min-width: 0; width: 100%; container-type: inline-size; }
  .workspace-panes { display: grid; min-width: 0; align-items: start; gap: 14px; grid-template-columns: minmax(0, 1fr); grid-template-areas: 'explorer'; }
  .workspace-panes.has-active { grid-template-areas: 'viewer' 'inspector' 'explorer'; }
  .workspace-panes.has-active.inspector-hidden { grid-template-areas: 'viewer' 'explorer'; }
  .workspace-panes.inspector-hidden .inspector-pane, .workspace-panes.inspector-hidden .second-divider { display: none; }
  .pane { min-width: 0; max-width: 100%; }
  .explorer-pane { grid-area: explorer; container-name:explorer; container-type:inline-size; }
  .viewer-pane { grid-area: viewer; }
  .inspector-pane { grid-area: inspector; }
  .workspace-panes:not(.has-active) .viewer-pane, .workspace-panes:not(.has-active) .inspector-pane { display: none; }
  .pane-divider { display: none; }
  .pane-divider { position:relative; }
  .pane-divider::before { content:''; position:absolute; inset:0 -3px; }
  .pane-divider span { position:absolute; top:clamp(100px,90%,calc(100% - 60px)); display:block; width:4px; height:48px; border-radius:4px; background:var(--muted); opacity:.65; }
  .pane-divider:hover span, .pane-divider:focus-visible span, .dragging .pane-divider span { background:var(--selection-accent); }
  .pane-divider:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
  .dragging { user-select: none; }
  @media (min-width: 1100px) {
    @container (min-width: 548px) {
      .workspace-panes.has-active.inspector-hidden { gap: 0; grid-template-columns: minmax(0, var(--explorer-size)) 8px minmax(0, var(--viewer-size)); grid-template-areas: 'explorer first viewer'; }
      .has-active.inspector-hidden .first-divider { display: flex; align-items: center; justify-content: center; align-self: stretch; min-height: 160px; cursor: col-resize; touch-action: none; grid-area: first; }
    }
    @container (min-width: 796px) {
      .workspace-panes.has-active { gap: 0; grid-template-columns: minmax(0, var(--explorer-size)) 8px minmax(0, var(--viewer-size)) 8px minmax(0, var(--inspector-size)); grid-template-areas: 'explorer first viewer second inspector'; }
      .has-active .pane-divider { display: flex; align-items: center; justify-content: center; align-self: stretch; min-height: 160px; cursor: col-resize; touch-action: none; }
      .first-divider { grid-area: first; }
      .second-divider { grid-area: second; }
      .pane-divider:hover span, .pane-divider:focus-visible span, .dragging .pane-divider span { background:var(--selection-accent); }
      .pane-divider:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
    }
  }
  @media (prefers-reduced-motion: no-preference) { .pane-divider span { transition: background 110ms; } }
</style>
