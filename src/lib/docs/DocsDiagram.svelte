<script lang="ts">
  import { diagrams, type DiagramKind } from './diagrams';
  let { kind, caption }: { kind: DiagramKind; caption: string } = $props();
  const uid = $props.id();
  const diagram = $derived(diagrams[kind]);
  const glyphs = {
    folder:'M3 7V5h6l3 3h9v12H3Z', film:'M3 4h18v16H3ZM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4',
    check:'M5 12l4 4L20 5', notes:'M4 4h16v12H9l-5 4ZM8 8h8M8 12h5',
    link:'M9 15l6-6M8 14l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0M16 10l2-2a3 3 0 0 0-4-4l-2 2',
    lock:'M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4',send:'M3 3l18 9-18 9 4-9ZM7 12h14',
    code:'M8 5 2 12l6 7M16 5l6 7-6 7M14 3l-4 18',store:'M3 5c0-4 18-4 18 0v14c0 4-18 4-18 0ZM3 5c0 4 18 4 18 0M3 12c0 4 18 4 18 0',
    server:'M3 3h18v7H3ZM3 14h18v7H3ZM7 6h1M7 17h1',
  };
</script>

<figure class="docs-map">
  {#each [diagram.wide, diagram.narrow] as graph, index (index)}
    <div class:map-wide={index === 0} class:map-narrow={index === 1} class="map-scroll">
      <svg class="map-canvas" viewBox={`0 0 ${graph.width} ${graph.height}`} role="img" aria-labelledby={`${uid}-${index}-title ${uid}-${index}-desc`} style:--map-width={`${graph.width}px`}>
        <title id={`${uid}-${index}-title`}>{diagram.title}</title>
        <desc id={`${uid}-${index}-desc`}>{diagram.description}</desc>
        <defs><marker id={`${uid}-${index}-arrow`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1L6 4L1 7" fill="none" stroke="currentColor" stroke-width="1.2" /></marker></defs>
        <g class="map-connections">{#each graph.paths as path (path)}<path d={path} marker-end={`url(#${uid}-${index}-arrow)`} />{/each}</g>
        {#each graph.nodes as item (item.id)}
          <g class:map-accent={item.accent} class="map-node">
            {#if item.shape === 'folder'}
              <path class="map-shape" d={`M${item.x} ${item.y+16}V${item.y+6}Q${item.x} ${item.y} ${item.x+6} ${item.y}H${item.x+64}L${item.x+80} ${item.y+16}H${item.x+item.w-6}Q${item.x+item.w} ${item.y+16} ${item.x+item.w} ${item.y+22}V${item.y+item.h-6}Q${item.x+item.w} ${item.y+item.h} ${item.x+item.w-6} ${item.y+item.h}H${item.x+6}Q${item.x} ${item.y+item.h} ${item.x} ${item.y+item.h-6}Z`} />
            {:else if item.shape === 'store'}
              <path class="map-shape" d={`M${item.x} ${item.y+16}C${item.x} ${item.y-4} ${item.x+item.w} ${item.y-4} ${item.x+item.w} ${item.y+16}V${item.y+item.h-16}C${item.x+item.w} ${item.y+item.h+4} ${item.x} ${item.y+item.h+4} ${item.x} ${item.y+item.h-16}Z`} />
              <path class="map-store-rim" d={`M${item.x} ${item.y+16}C${item.x} ${item.y+36} ${item.x+item.w} ${item.y+36} ${item.x+item.w} ${item.y+16}`} />
            {:else}<rect class="map-shape" x={item.x} y={item.y} width={item.w} height={item.h} rx="6" />{/if}
            <svg x={item.x+16} y={item.y+24} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path class="map-glyph" d={glyphs[item.icon]} /></svg>
            {#if item.shape === 'media'}<g class="map-film" aria-hidden="true"><rect x={item.x+item.w-66} y={item.y+20} width="48" height="32" rx="3" /><path d={`M${item.x+item.w-46} ${item.y+28}l12 8-12 8Z`} /></g>{/if}
            <text class="map-name" class:compact={item.w < 160} x={item.x+16} y={item.y+60}>{item.label}</text>
            <text class="map-detail" x={item.x+16} y={item.y+80}>{item.detail}</text>
            {#if item.takes}<g class="map-takes">{#each ['v001','v002','v003'] as take, ti (take)}<rect class:chosen={ti===2} x={item.x+16+ti*76} y={item.y+108} width="64" height="28" rx="3" /><text class:chosen-text={ti===2} x={item.x+48+ti*76} y={item.y+127} text-anchor="middle">{take}{ti===2?' ✓':''}</text>{/each}</g>{/if}
          </g>
        {/each}
      </svg>
    </div>
  {/each}
  <figcaption>{caption}</figcaption>
</figure>

<style>
  .docs-map{margin:28px 0 36px;border:1px solid var(--border);background:var(--panel);border-radius:6px;overflow:hidden}
  .map-scroll{width:100%;min-width:0;overflow-x:auto}.map-narrow{display:none}
  .map-canvas{display:block;width:100%;min-width:var(--map-width);color:var(--muted)}
  .map-connections path{fill:none;stroke:#8d9e9b;stroke-width:1.4}.map-shape{fill:var(--canvas);stroke:#4d5957;stroke-width:1}
  .map-node.map-accent .map-shape{fill:#17342f;stroke:var(--teal)}.map-store-rim{fill:none;stroke:#4d5957;stroke-width:1}
  .map-glyph{fill:none;stroke:var(--muted);stroke-width:1.3;stroke-linejoin:round;stroke-linecap:round}.map-accent .map-glyph{stroke:var(--teal)}
  .map-name{fill:var(--ink);font-size:16px;font-weight:500;letter-spacing:-.2px}.map-name.compact{font-size:15px}.map-detail{fill:#a8b1af;font-size:12px}
  .map-film rect{fill:#202c29;stroke:#40534e}.map-film path{fill:#8daba4}.map-takes rect{fill:var(--panel);stroke:#4d5957}.map-takes text{fill:var(--muted);font-size:12px}.map-takes rect.chosen{fill:#285d52;stroke:var(--teal)}.map-takes text.chosen-text{fill:var(--teal)}
  figcaption{padding:16px 22px;border-top:1px solid var(--border);font-size:12px;line-height:1.8;color:var(--muted)}
  @media(max-width:1199px){.map-wide{display:none}.map-narrow{display:block;max-width:480px;margin:auto}}
  @media print{.map-canvas{min-width:0}.map-scroll{overflow:visible}}
</style>
