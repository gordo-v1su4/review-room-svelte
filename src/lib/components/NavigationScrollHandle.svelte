<script lang="ts">
  let { target }: { target: HTMLElement | undefined } = $props();
  let metrics = $state({ left: 0, top: 0, height: 0, travel: 0, max: 0, value: 0, visible: false });
  let dragging = $state(false);
  let dragStartY = 0;
  let dragStartScroll = 0;

  function measure() {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const max = Math.max(0, target.scrollHeight - target.clientHeight);
    const inset = Math.min(12, rect.height / 4);
    const railHeight = Math.max(0, rect.height - inset - 24);
    const height = Math.min(144, railHeight, Math.max(48, railHeight * target.clientHeight / target.scrollHeight));
    const travel = Math.max(0, railHeight - height);
    const value = max ? Math.min(100, Math.max(0, target.scrollTop / max * 100)) : 0;
    metrics = { left: rect.right - 10, top: rect.top + inset + travel * value / 100, height, travel, max, value, visible: max > 1 && rect.width > 0 && railHeight > 0 };
  }

  $effect(() => {
    const element = target;
    if (!element) return;
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    for (const child of element.children) {
      if (!child.classList.contains('navigation-scroll-handle')) resize.observe(child);
    }
    const mutation = new MutationObserver(records => {
      if (records.some(record => !(record.target instanceof Element) || !record.target.closest('.navigation-scroll-handle'))) measure();
    });
    mutation.observe(element, { childList: true, subtree: true, attributes: true });
    element.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      resize.disconnect(); mutation.disconnect();
      element.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  });

  function startDrag(event: PointerEvent) {
    if (!target || event.button !== 0) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).focus();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragStartY = event.clientY; dragStartScroll = target.scrollTop; dragging = true;
  }
  function drag(event: PointerEvent) {
    if (dragging && target && metrics.travel) target.scrollTop = dragStartScroll + (event.clientY - dragStartY) * metrics.max / metrics.travel;
  }
  function keyboard(event: KeyboardEvent) {
    if (!target) return;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? metrics.max
      : event.key === 'ArrowUp' ? target.scrollTop - 40 : event.key === 'ArrowDown' ? target.scrollTop + 40
      : event.key === 'PageUp' ? target.scrollTop - target.clientHeight * .8 : event.key === 'PageDown' ? target.scrollTop + target.clientHeight * .8 : null;
    if (next === null) return;
    event.preventDefault(); target.scrollTop = next;
  }
</script>

{#if metrics.visible}
  <div class="navigation-scroll-handle" class:dragging role="scrollbar" tabindex="0"
    aria-label="Scroll project navigation" aria-controls="review-room-navigation" aria-orientation="vertical"
    aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(metrics.value)}
    style:left={`${metrics.left}px`} style:top={`${metrics.top}px`} style:height={`${metrics.height}px`}
    onpointerdown={startDrag} onpointermove={drag} onpointerup={() => dragging = false}
    onpointercancel={() => dragging = false} onlostpointercapture={() => dragging = false} onkeydown={keyboard}></div>
{/if}

<style>
  .navigation-scroll-handle { position:fixed; z-index:12; width:20px; touch-action:none; cursor:grab; outline:none; }
  .navigation-scroll-handle::before { content:''; position:absolute; top:0; bottom:0; left:7px; width:6px; border-radius:6px; background:rgb(77 155 141 / 20%); transition:background 140ms; }
  .navigation-scroll-handle:hover::before, .navigation-scroll-handle:focus-visible::before, .navigation-scroll-handle.dragging::before { background:rgb(125 217 200 / 48%); }
  .navigation-scroll-handle:focus-visible { outline:none; }
  .navigation-scroll-handle.dragging { cursor:grabbing; }
  @media (max-width:1023px) { .navigation-scroll-handle { display:none; } }
  @media (prefers-reduced-motion:reduce) { .navigation-scroll-handle::before { transition:none; } }
</style>
