<script lang="ts">
  import { diagrams, type DiagramKind } from './diagrams';
  import { Folder, Clapperboard, CircleCheck, MessageSquare, Link, LockKeyhole, Send, CodeXml, Database, Server, Check } from 'lucide-svelte';
  let { kind, caption }: { kind: DiagramKind; caption: string } = $props();
  const uid = $props.id();
  const diagram = $derived(diagrams[kind]);
  const icons = { folder: Folder, film: Clapperboard, check: CircleCheck, notes: MessageSquare, link: Link, lock: LockKeyhole, send: Send, code: CodeXml, store: Database, server: Server };
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
          {@const Icon = icons[item.icon]}
          <g class:map-accent={item.accent} class="map-node">
            <rect class="map-shadow" x={item.x+2} y={item.y+3} width={item.w} height={item.h} rx="6" />
            <rect class="map-shape" x={item.x} y={item.y} width={item.w} height={item.h} rx="6" />
            <Icon x={item.x+14} y={item.y+16} size={22} strokeWidth={1.5} color="#b5c4be" fill={item.icon === 'folder' ? '#34403c' : 'none'} aria-hidden="true" />
            <text class="map-name" x={item.x+48} y={item.y+31}>{item.label}</text>
            <text class="map-detail" x={item.x+16} y={item.y+55}>{item.detail}</text>
            {#if item.takes}
              <g class="map-takes">
                {#each ['v001','v002','v003'] as take, ti (take)}
                  {@const badgeX = item.x+16+ti*72}
                  <rect class:chosen={ti===2} x={badgeX} y={item.y+72} width="60" height="24" rx="2" />
                  <text class:chosen-text={ti===2} x={badgeX+(ti===2?24:30)} y={item.y+84} text-anchor="middle" dominant-baseline="central">{take}</text>
                  {#if ti===2}<Check x={badgeX+44} y={item.y+79} size={10} strokeWidth={1.8} color="#7dd9c8" aria-hidden="true" />{/if}
                {/each}
              </g>
            {/if}
          </g>
        {/each}
      </svg>
    </div>
  {/each}
  <figcaption>{caption}</figcaption>
</figure>

<style>
  .docs-diagram{margin:20px 0 28px;border:1px solid rgb(52 58 61 / var(--docs-outline-opacity,.25));background:#101213;border-radius:6px;overflow:hidden}
  .map-scroll{width:100%;min-width:0;overflow:auto;scrollbar-width:thin}.map-scroll:focus-visible{outline:1px solid var(--teal);outline-offset:-2px}.map-narrow{display:none}
  .map-canvas{display:block;width:min(100%,var(--map-width));max-width:var(--map-width);height:auto;margin:auto;font-family:Geist,system-ui,sans-serif}
  .map-zone{fill:#141819;stroke:#343a3d;stroke-width:.8;stroke-opacity:var(--docs-outline-opacity,.25)}.map-zone-label{fill:#969c9e;font:8px 'Geist Mono',ui-monospace,monospace;letter-spacing:1px}
  .map-connections path{fill:none;stroke:#969c9e;stroke-width:1}.map-shadow{fill:#000;opacity:.25}.map-shape{fill:#181a1c;stroke:#596266;stroke-width:1;stroke-opacity:var(--docs-outline-opacity,.25)}
  .map-edge-label rect{fill:#101213}.map-edge-label text{fill:#a9b1b3;font:9px system-ui,sans-serif}
  .map-node.map-accent .map-shape{fill:#18342e;stroke:#7dd9c8}
  .map-name{fill:#e8eceb;font-size:12px;font-weight:600}.map-detail{fill:#a9b1b3;font:9px 'Geist Mono',ui-monospace,monospace}
  .map-takes rect{fill:#222527;stroke:#596266;stroke-width:.8;stroke-opacity:var(--docs-outline-opacity,.25)}.map-takes text{fill:#a9b1b3;font:11px 'Geist Mono',ui-monospace,monospace}.map-takes rect.chosen{fill:#29433c;stroke:#7dd9c8}.map-takes text.chosen-text{fill:#7dd9c8}
  figcaption{padding:12px 16px;border-top:1px solid rgb(52 58 61 / var(--docs-outline-opacity,.25));font-size:12px;line-height:1.75;color:#a9b1b3}
  @media(max-width:1100px){.map-narrow .map-name{font-size:13px}.map-narrow .map-detail{font-size:11px}.map-wide{display:none}.map-narrow{display:block}.map-canvas{width:min(100%,var(--map-width));max-width:var(--map-width)}}
  @media print{.map-canvas{max-width:100%}.map-scroll{overflow:visible}}
</style>
