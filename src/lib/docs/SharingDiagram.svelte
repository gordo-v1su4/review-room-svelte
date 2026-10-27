<script lang="ts">
  const destinations = [
    { id: 'source', kind: 'Source', title: 'Media in Review Room', lines: ['Original files and stored takes stay here.', 'An upload does not make them public.'], foot: 'Choose an audience below' },
    { id: 'review', kind: 'Feedback', title: 'Private review link', lines: ['Invite people to watch and comment.', 'Use a project review link.'], foot: 'Share for review' },
    { id: 'trailer', kind: 'Publication', title: 'Trailer Feed', lines: ['Explicitly publish exact ready versions.', 'Refresh or unsync deliberately.'], foot: 'Consent applies to the published version' },
    { id: 'embed', kind: 'Embed / showcase', title: 'Video on another site', lines: ['Choose an approved, ready take.', 'Allow the sites that may embed it.'], foot: 'Approved take + allowed site origins' },
  ];
  const layouts = [
    { id: 'wide', width: 960, height: 432, positions: [{x:320,y:24,w:320},{x:24,y:252,w:280},{x:340,y:252,w:280},{x:656,y:252,w:280}] },
    { id: 'narrow', width: 360, height: 856, positions: [{x:56,y:24,w:280},{x:56,y:260,w:280},{x:56,y:468,w:280},{x:56,y:676,w:280}] },
  ];
</script>

<figure class="docs-map">
  <div class="map-heading"><h2>Three ways to share</h2><span>Different audiences, different access</span></div>
  {#each layouts as layout (layout.id)}
    <svg class={layout.id} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-labelledby={`sharing-${layout.id}-title sharing-${layout.id}-desc`}>
      <title id={`sharing-${layout.id}-title`}>Choose how people see your media</title>
      <desc id={`sharing-${layout.id}-desc`}>Media stays in Review Room. A private review link invites feedback. Trailer Feed requires explicit publication of exact ready versions. Video embeds and showcases require an approved ready take and allowed site origins. Upload, approval and current-take selection never publish automatically.</desc>
      <defs>
        <pattern id={`sharing-${layout.id}-dots`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#465052" opacity=".45" /></pattern>
        <marker id={`sharing-${layout.id}-arrow`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="#a9b1b3" stroke-width="1.2" /></marker>
      </defs>
      <rect width={layout.width} height={layout.height} fill={`url(#sharing-${layout.id}-dots)`} />
      <g class="connectors" marker-end={`url(#sharing-${layout.id}-arrow)`}>
        {#if layout.id === 'wide'}
          <path d="M400 180V208Q400 216 392 216H172Q164 216 164 224V244" />
          <path d="M480 180V244" />
          <path d="M560 180V208Q560 216 568 216H788Q796 216 796 224V244" />
        {:else}
          <path d="M56 136H44Q36 136 36 144V330Q36 338 44 338H48" />
          <path d="M56 104H32Q24 104 24 112V538Q24 546 32 546H48" />
          <path d="M56 72H20Q12 72 12 80V746Q12 754 20 754H48" />
        {/if}
      </g>
      {#each destinations as destination, i (destination.id)}
        {@const pos = layout.positions[i]}
        <g transform={`translate(${pos.x} ${pos.y})`} class:ready={destination.id === 'source'}>
          <rect class="offset" x="3" y="4" width={pos.w} height="156" rx="6" />
          <rect class="node" width={pos.w} height="156" rx="6" />
          <path class="band" d={`M1 6Q1 1 6 1H${pos.w-6}Q${pos.w-1} 1 ${pos.w-1} 6V56H1Z`} />
          <text class="kind" x="16" y="23">{destination.kind}</text>
          <text class="node-title" x="16" y="45">{destination.title}</text>
          <path class="rule" d={`M1 56H${pos.w-1}`} />
          {#each destination.lines as line, n (line)}<text class="detail" x="16" y={80+n*22}>{line}</text>{/each}
          <path class="rule" d={`M16 120H${pos.w-16}`} />
          <text class="foot" x="16" y="142">{destination.foot}</text>
        </g>
      {/each}
    </svg>
  {/each}
  <figcaption>Approval and Make current change review state or the saved take. Neither publishes media or replaces an existing publication.</figcaption>
</figure>
