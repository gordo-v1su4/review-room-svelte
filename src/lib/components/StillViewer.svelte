<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { ArrowUpRight, Circle, Download, Maximize, Minimize, Pencil, Save, Square, Trash2, Undo2 } from 'lucide-svelte';
  import type { AnnotationPoint, AnnotationStroke, AnnotationTool } from '$lib/annotations';

  let { assetId, src, name, strokes, dirty, canAnnotate = false, saveDisabled = false, canDownload = false, onChange, onSave, onmetadata, onViewed, onfailure }: {
    assetId: string;
    src: string;
    name: string;
    strokes: readonly AnnotationStroke[];
    dirty: boolean;
    canAnnotate?: boolean;
    saveDisabled?: boolean;
    canDownload?: boolean;
    onChange: (strokes: AnnotationStroke[]) => void;
    onSave: () => void | Promise<void>;
    onmetadata?: (size: { width: number; height: number }) => void;
    onViewed?: () => void;
    onfailure?: (source: string) => void;
  } = $props();
  let root: HTMLDivElement;
  let surface: HTMLDivElement;
  let tool = $state<AnnotationTool>('pen');
  let color = $state('#62b9aa');
  let width = $state(3);
  let fullscreen = $state(false);
  let loadedSource = $state('');
  let failedSource = $state('');
  let message = $state('');
  let saving = $state(false);
  let active = $state.raw<{ assetId: string; src: string; pointerId: number; stroke: AnnotationStroke } | null>(null);
  const tools = [
    { id: 'pen', label: 'Draw', icon: Pencil }, { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
    { id: 'rect', label: 'Rectangle', icon: Square }, { id: 'circle', label: 'Ellipse', icon: Circle }
  ] as const;
  const colors = [{ value: '#62b9aa', label: 'Teal' }, { value: '#ef4444', label: 'Red' }, { value: '#f59e0b', label: 'Amber' }, { value: '#3b82f6', label: 'Blue' }];
  let activeHere = $derived(active?.assetId === assetId && active?.src === src ? active : null);
  let drawn = $derived(activeHere ? [...strokes, activeHere.stroke] : strokes);

  function cancelStroke() {
    const pointerId = active?.pointerId;
    active = null;
    if (pointerId !== undefined && surface?.hasPointerCapture(pointerId)) surface.releasePointerCapture(pointerId);
  }
  $effect(() => {
    // Release capture when the caller changes the asset or its edit permission.
    assetId; src; canAnnotate;
    return () => untrack(() => { cancelStroke(); message = ''; });
  });
  onDestroy(cancelStroke);

  function pointFor(event: PointerEvent): AnnotationPoint {
    const rect = surface.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) };
  }
  function start(event: PointerEvent) {
    if (!canAnnotate || saving || loadedSource !== src || active || event.button !== 0 || !event.isPrimary) return;
    if (strokes.length >= 120) { message = 'This image has 120 marks. Undo or clear a mark to draw another.'; return; }
    message = '';
    event.preventDefault();
    surface.focus({ preventScroll: true });
    surface.setPointerCapture(event.pointerId);
    const point = pointFor(event);
    active = { assetId, src, pointerId: event.pointerId, stroke: { id: crypto.randomUUID(), tool, color, width, points: tool === 'pen' ? [point] : [point, point] } };
  }
  function move(event: PointerEvent) {
    if (!activeHere || activeHere.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = pointFor(event);
    const previous = activeHere.stroke.points.at(-1)!;
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.001) return;
    if (activeHere.stroke.tool === 'pen' && activeHere.stroke.points.length >= 1500) { message = 'Stroke point limit reached. Release to finish, then start a new stroke.'; return; }
    const points = activeHere.stroke.tool === 'pen' ? [...activeHere.stroke.points, point] : [activeHere.stroke.points[0], point];
    active = { ...activeHere, stroke: { ...activeHere.stroke, points } };
  }
  function finish(event: PointerEvent) {
    if (!activeHere || activeHere.pointerId !== event.pointerId) return;
    move(event);
    const stroke = activeHere.stroke;
    const first = stroke.points[0];
    const last = stroke.points.at(-1)!;
    const valid = stroke.tool === 'pen' ? stroke.points.length > 1 : Math.hypot(last.x - first.x, last.y - first.y) > 0.005;
    cancelStroke();
    if (canAnnotate && valid) changeStrokes([...strokes, stroke]);
  }
  function changeStrokes(next: AnnotationStroke[]) {
    if (!canAnnotate || saving) return;
    try { onChange(next); } catch (error) { message = error instanceof Error ? error.message : 'Could not update markup.'; }
  }
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && active) { event.preventDefault(); event.stopPropagation(); cancelStroke(); }
  }
  function imageLoaded(event: Event) {
    const image = event.currentTarget as HTMLImageElement;
    if (image.getAttribute('src') !== src) return;
    loadedSource = src; failedSource = '';
    onmetadata?.({ width: image.naturalWidth, height: image.naturalHeight });
    onViewed?.();
  }
  async function toggleFullscreen() {
    message = '';
    try { if (document.fullscreenElement === root) await document.exitFullscreen(); else await root.requestFullscreen(); }
    catch { message = 'Fullscreen is unavailable in this browser.'; }
  }
  async function save() {
    if (!canAnnotate || saveDisabled || !dirty || saving || active) return;
    saving = true; message = '';
    const savedAssetId = assetId;
    try { await onSave(); if (assetId === savedAssetId) message = 'Saved in this session.'; } catch (error) { if (assetId === savedAssetId) message = error instanceof Error ? error.message : 'Could not save markup.'; }
    finally { saving = false; }
  }
  function path(points: readonly AnnotationPoint[]) { return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(4)} ${point.y.toFixed(4)}`).join(' '); }
  function arrowHead(start: AnnotationPoint, end: AnnotationPoint) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const length = .018;
    return `${end.x},${end.y} ${end.x - length * Math.cos(angle - Math.PI / 6)},${end.y - length * Math.sin(angle - Math.PI / 6)} ${end.x - length * Math.cos(angle + Math.PI / 6)},${end.y - length * Math.sin(angle + Math.PI / 6)}`;
  }
</script>

<svelte:document onfullscreenchange={() => fullscreen = document.fullscreenElement === root}/>
<div class="still-viewer" bind:this={root}>
  <div class="still-toolbar" aria-label="Image tools">
    {#if canAnnotate}
      <div class="tool-group" aria-label="Markup tools">{#each tools as item (item.id)}<button type="button" class:chosen={tool === item.id} aria-label={item.label} title={item.label} aria-pressed={tool === item.id} disabled={saving} onclick={() => { cancelStroke(); tool = item.id; }}><item.icon size={15}/></button>{/each}</div>
      <div class="tool-group colors" aria-label="Markup colors">{#each colors as item (item.value)}<button type="button" aria-label={`${item.label} markup`} title={item.label} aria-pressed={color === item.value} class:chosen={color === item.value} disabled={saving} onclick={() => color = item.value}><span style:background={item.value}></span></button>{/each}</div>
      <label class="stroke-size">Width<select aria-label="Markup width" bind:value={width} disabled={saving}><option value={2}>2 px</option><option value={3}>3 px</option><option value={5}>5 px</option><option value={8}>8 px</option></select></label>
      <div class="tool-group actions"><button type="button" aria-label="Undo markup" title="Undo" disabled={!strokes.length || saving} onclick={() => { cancelStroke(); changeStrokes(strokes.slice(0, -1)); }}><Undo2 size={15}/></button><button type="button" aria-label="Clear markup" title="Clear markup" disabled={!strokes.length || saving} onclick={() => { cancelStroke(); changeStrokes([]); }}><Trash2 size={15}/></button><button type="button" class="save" disabled={!dirty || saving || saveDisabled || Boolean(active)} onclick={save}><Save size={13}/>{saving ? 'Saving' : 'Save'}</button></div>
    {/if}
    <!-- Original media Blob URLs are downloads, not SvelteKit routes; do not resolve them. -->
    {#if canDownload}<a class="download" href={src} download={name} aria-label={`Download ${name}`} title="Download original"><Download size={15}/></a>{/if}
    <button type="button" class="fullscreen" aria-label={fullscreen ? 'Exit image fullscreen' : 'Image fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onclick={toggleFullscreen}>{#if fullscreen}<Minimize size={16}/>{:else}<Maximize size={16}/>{/if}</button>
  </div>
  <div class="still-stage">
    {#if failedSource === src}<p class="image-error" role="status">Could not load this image.</p>{/if}
    <div class="image-content" class:failed={failedSource === src}>
      <img {src} alt={name} draggable="false" onload={imageLoaded} onerror={() => { failedSource = src; cancelStroke(); onfailure?.(src); }}/>
      <!-- The drawing surface is an image-editing application with a labelled keyboard cancellation action. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
      <div class="drawing-surface" class:editable={canAnnotate && !saving} bind:this={surface} role="application" tabindex={canAnnotate ? 0 : -1} aria-label={canAnnotate ? `Annotate ${name}. Drag to draw; Escape cancels the current stroke.` : `Markup for ${name}`} onpointerdown={start} onpointermove={move} onpointerup={finish} onpointercancel={cancelStroke} onlostpointercapture={cancelStroke} onkeydown={keydown}>
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {#each drawn as stroke (stroke.id)}
            {@const first = stroke.points[0]}
            {@const last = stroke.points.at(-1)}
            {#if first && last}
              <g fill="none" stroke={stroke.color} stroke-width={stroke.width}>
                {#if !stroke.tool || stroke.tool === 'pen'}<path d={path(stroke.points)} stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
                {:else if stroke.tool === 'rect'}<rect x={Math.min(first.x, last.x)} y={Math.min(first.y, last.y)} width={Math.abs(last.x - first.x)} height={Math.abs(last.y - first.y)} vector-effect="non-scaling-stroke"/>
                {:else if stroke.tool === 'circle'}<ellipse cx={(first.x + last.x) / 2} cy={(first.y + last.y) / 2} rx={Math.abs(last.x - first.x) / 2} ry={Math.abs(last.y - first.y) / 2} vector-effect="non-scaling-stroke"/>
                {:else}<line x1={first.x} y1={first.y} x2={last.x} y2={last.y} vector-effect="non-scaling-stroke"/><polygon points={arrowHead(first,last)} fill={stroke.color} stroke="none"/>{/if}
              </g>
            {/if}
          {/each}
        </svg>
      </div>
    </div>
  </div>
  <div class="still-footer"><span>{canAnnotate && dirty ? 'Unsaved markup' : strokes.length ? `${strokes.length} mark${strokes.length === 1 ? '' : 's'}` : 'Still image'}</span>{#if message}<span role="status">{message}</span>{/if}</div>
</div>

<style>
  .still-viewer { min-width: 0; background: #000; color: var(--ink); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .still-toolbar { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; padding: 7px; background: var(--panel); border-bottom: 1px solid var(--border); }
  .tool-group { display: flex; align-items: center; gap: 2px; }
  button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 29px; height: 29px; border: 0; border-radius: 4px; color: var(--muted); background: transparent; font: inherit; font-size: 11px; cursor: pointer; }
  button:hover:not(:disabled) { background: var(--raised); color: var(--ink); }
  button:disabled { opacity: .35; cursor: default; }
  button.chosen { background: color-mix(in srgb, var(--accent, #62b9aa) 14%, var(--panel)); color: var(--ink); }
  button:focus-visible,select:focus-visible,.drawing-surface:focus-visible { outline: 1px solid var(--accent, #62b9aa); outline-offset: -1px; }
  .colors button { min-width: 25px; }
  .colors span { width: 10px; height: 10px; border-radius: 2px; }
  .stroke-size { display: inline-flex; gap: 5px; align-items: center; color: var(--muted); font-size: 10px; padding: 0 4px; }
  select { background: var(--canvas); color: var(--ink); height: 28px; border: 1px solid var(--border); border-radius: 4px; font: inherit; padding: 0 3px; }
  button.save { padding: 0 8px; color: var(--ink); background: var(--raised); }
  .fullscreen { margin-left: auto; }
  .download { display: inline-flex; align-items: center; justify-content: center; min-width: 29px; height: 29px; color: var(--muted); border-radius: 4px; }
  .download:hover { color: var(--ink); background: var(--raised); }
  .download:focus-visible { outline: 1px solid var(--accent, #62b9aa); }
  .still-stage { display: flex; align-items: center; justify-content: center; min-height: 160px; padding: 0; }
  .image-content { position: relative; max-width: 100%; width: fit-content; line-height: 0; }
  .image-content.failed { display: none; }
  img { display: block; width: auto; height: auto; max-width: 100%; max-height: min(62dvh, 720px); object-fit: contain; user-select: none; }
  .drawing-surface { position: absolute; inset: 0; }
  .drawing-surface.editable { touch-action: none; cursor: crosshair; }
  svg { display: block; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  .still-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; padding: 8px 10px; color: var(--muted); font-size: 10px; background: var(--panel); border-top: 1px solid var(--border); }
  .image-error { padding: 24px; font-size: 12px; color: var(--muted); }
  .still-viewer:fullscreen { display: flex; flex-direction: column; border-radius: 0; }
  .still-viewer:fullscreen .still-stage { flex: 1; min-height: 0; }
  .still-viewer:fullscreen img { max-height: calc(100dvh - 132px); }
  @media (pointer: coarse) { button,.colors button,.download { min-width: 44px; height: 44px; } select { height: 44px; font-size: 16px; } .still-toolbar { gap: 3px; } }
</style>
