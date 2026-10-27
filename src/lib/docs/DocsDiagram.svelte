<script lang="ts">
  import { diagrams, type DiagramKind } from './diagrams';
  import FolderArtwork from '$lib/components/FolderArtwork.svelte';
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
<figure class="docs-diagram">
  {#each [diagram.wide, diagram.narrow] as graph, index (index)}
    <!-- Keyboard focus is needed to scroll the full-size canvas. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class:map-wide={index === 0} class:map-narrow={index === 1} class="map-scroll" role="region" aria-label={diagram.title} tabindex="0">
      <svg class="map-canvas" viewBox={`0 0 ${graph.width} ${graph.height}`} role="img" aria-labelledby={`${uid}-${index}-title ${uid}-${index}-desc`} style:--map-width={`${graph.width}px`}>
        <title id={`${uid}-${index}-title`}>{diagram.title}</title>
        <desc id={`${uid}-${index}-desc`}>{diagram.description}</desc>
        <defs>
          <pattern id={`${uid}-${index}-dots`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#465052" opacity=".35" /></pattern>
          <marker id={`${uid}-${index}-arrow`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0 0L8 3L0 6" fill="#969c9e" /></marker>
        </defs>
        <rect width={graph.width} height={graph.height} fill={`url(#${uid}-${index}-dots)`} />
        {#each graph.zones ?? [] as zone (zone.label)}<g><rect class="map-zone" x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx="6" /><text class="map-zone-label" x={zone.x+16} y={zone.y+22}>{zone.label}</text></g>{/each}
        <g class="map-connections">{#each graph.paths as path (path)}<path d={path} marker-end={`url(#${uid}-${index}-arrow)`} />{/each}</g>
        {#each graph.labels ?? [] as label (label.text)}
          <g class="map-edge-label"><rect x={label.x-label.text.length*2.6-6} y={label.y-11} width={label.text.length*5.2+12} height="16" rx="2" /><text x={label.x} y={label.y} text-anchor="middle">{label.text}</text></g>
        {/each}
        {#each graph.nodes as item (item.id)}
          <g class:map-accent={item.accent} class="map-node">
            <rect class="map-shadow" x={item.x+2} y={item.y+3} width={item.w} height={item.h} rx="6" />
            <rect class="map-shape" x={item.x} y={item.y} width={item.w} height={item.h} rx="6" />
            {#if item.icon === 'folder'}
              <foreignObject x={item.x+10} y={item.y+10} width="32" height="29"><div class="map-folder-art"><FolderArtwork /></div></foreignObject>
            {:else}
              <g transform={`translate(${item.x+16} ${item.y+18}) scale(.75)`} aria-hidden="true"><path class="map-glyph" d={glyphs[item.icon]} /></g>
            {/if}
            <text class="map-name" x={item.x+48} y={item.y+31}>{item.label}</text>
            <text class="map-detail" x={item.x+16} y={item.y+55}>{item.detail}</text>
            {#if item.takes}<g class="map-takes">{#each ['v001','v002','v003'] as take, ti (take)}<rect class:chosen={ti===2} x={item.x+16+ti*64} y={item.y+72} width="52" height="20" rx="2" /><text class:chosen-text={ti===2} x={item.x+42+ti*64} y={item.y+86} text-anchor="middle">{take}{ti===2?' ✓':''}</text>{/each}</g>{/if}
          </g>
        {/each}
      </svg>
    </div>
  {/each}
  <figcaption>{caption}</figcaption>
</figure>

<style>
  .docs-diagram{margin:20px 0 28px;border:1px solid #343a3d;background:#101213;border-radius:6px;overflow:hidden}
  .map-scroll{width:100%;min-width:0;overflow:auto;scrollbar-width:thin}.map-scroll:focus-visible{outline:1px solid var(--teal);outline-offset:-2px}.map-narrow{display:none}
  .map-canvas{display:block;width:min(100%,var(--map-width));max-width:var(--map-width);height:auto;margin:auto;font-family:Geist,system-ui,sans-serif}
  .map-zone{fill:#141819;stroke:#343a3d;stroke-width:.8}.map-zone-label{fill:#969c9e;font:8px 'Geist Mono',ui-monospace,monospace;letter-spacing:1px}
  .map-connections path{fill:none;stroke:#969c9e;stroke-width:1}.map-shadow{fill:#000;opacity:.25}.map-shape{fill:#181a1c;stroke:#596266;stroke-width:1}
  .map-edge-label rect{fill:#101213}.map-edge-label text{fill:#a9b1b3;font:9px system-ui,sans-serif}
  .map-node.map-accent .map-shape{fill:#18342e;stroke:#7dd9c8}
  .map-folder-art{width:32px;height:29px}.map-glyph{fill:none;stroke:#a9b1b3;stroke-width:1;stroke-linejoin:round;stroke-linecap:round}
  .map-name{fill:#e8eceb;font-size:12px;font-weight:600}.map-detail{fill:#a9b1b3;font:9px 'Geist Mono',ui-monospace,monospace}
  .map-takes rect{fill:#222527;stroke:#596266;stroke-width:.8}.map-takes text{fill:#a9b1b3;font:9px 'Geist Mono',ui-monospace,monospace}.map-takes rect.chosen{fill:#29433c;stroke:#7dd9c8}.map-takes text.chosen-text{fill:#7dd9c8}
  figcaption{padding:12px 16px;border-top:1px solid #343a3d;font-size:12px;line-height:1.75;color:#a9b1b3}
  @media(max-width:1100px){.map-wide{display:none}.map-narrow{display:block}.map-canvas{width:min(100%,var(--map-width));max-width:var(--map-width)}}
  @media print{.map-canvas{max-width:100%}.map-scroll{overflow:visible}}
</style>
