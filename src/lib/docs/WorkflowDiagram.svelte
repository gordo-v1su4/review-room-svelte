<script lang="ts">
  const stages = [
    { id: 'place', step: '01', title: 'Project & folder', kind: 'Destination', lines: ['Choose a project root or real folder.', 'New uploads arrive in this location.'], foot: 'Folders organize · smart views filter' },
    { id: 'upload', step: '02', title: 'Upload media', kind: 'Ingest', lines: ['Add video, images or reference sheets.', 'Imports tracks transfer and retries.'], foot: 'An ordinary upload creates an asset' },
    { id: 'ready', step: '03', title: 'Ready for review', kind: 'Readiness', lines: ['Transfer and processing have finished.', 'Video previews are ready to inspect.'], foot: 'Wait for Ready before reviewing' },
    { id: 'review', step: '04', title: 'Review & choose', kind: 'Asset + take', lines: ['Asset: comments, rating, shortlist, decision.', 'Take: media, prompt, model, references.'], foot: 'Inspect a version · Make current saves the pick' },
    { id: 'share', step: '05', title: 'Share deliberately', kind: 'Audience', lines: ['Private review link for feedback.', 'Explicit publication for Trailer Feed or embed.'], foot: 'Approval and current take do not publish' },
  ];
  const layouts = [
    { id: 'wide', width: 960, height: 552, positions: [{x:40,y:76,w:248},{x:356,y:76,w:248},{x:672,y:76,w:248},{x:548,y:348,w:372},{x:40,y:348,w:372}] },
    { id: 'narrow', width: 360, height: 1180, positions: [{x:24,y:60,w:312},{x:24,y:284,w:312},{x:24,y:508,w:312},{x:24,y:732,w:312},{x:24,y:956,w:312}] },
  ];
</script>

<figure class="docs-map">
  <div class="map-heading"><h2>The everyday review flow</h2><span>Upload → review → share</span></div>
  {#each layouts as layout (layout.id)}
    <svg class={layout.id} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-labelledby={`workflow-${layout.id}-title workflow-${layout.id}-desc`}>
      <title id={`workflow-${layout.id}-title`}>The everyday review flow</title>
      <desc id={`workflow-${layout.id}-desc`}>Choose a project and folder, upload media and wait for Ready. Review feedback on the asset and choose a take, then share deliberately. A new version keeps revisions with the same asset; choosing or approving a take does not publish it.</desc>
      <defs>
        <pattern id={`workflow-${layout.id}-dots`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#465052" opacity=".45" /></pattern>
        <marker id={`workflow-${layout.id}-arrow`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="#a9b1b3" stroke-width="1.2" /></marker>
      </defs>
      <rect width={layout.width} height={layout.height} fill={`url(#workflow-${layout.id}-dots)`} />
      {#if layout.id === 'wide'}
        <rect class="zone" x="20" y="20" width="920" height="244" rx="8" />
        <text class="group-label" x="40" y="48">Bring the work into the room</text>
        <rect class="zone" x="20" y="300" width="920" height="232" rx="8" />
        <text class="group-label" x="40" y="332">Turn review into a deliberate choice</text>
        <g class="connectors" marker-end={`url(#workflow-${layout.id}-arrow)`}>
          <path d="M288 154H348" /><path d="M604 154H664" />
          <path d="M796 232V340" /><path d="M548 426H420" />
          <path class="revision" d="M580 348V288Q580 280 572 280H488Q480 280 480 272V240" />
        </g>
        <text class="route-label" x="816" y="272">Inspect</text>
        <text class="route-label" x="484" y="410" text-anchor="middle">Choose access</text>
        <text class="route-label" x="532" y="296" text-anchor="middle">New version</text>
      {:else}
        <text class="group-label" x="24" y="36">From destination to delivery</text>
        <g class="connectors" marker-end={`url(#workflow-${layout.id}-arrow)`}>
          <path d="M180 216V276" /><path d="M180 440V500" /><path d="M180 664V724" /><path d="M180 888V948" />
        </g>
      {/if}
      {#each stages as stage, i (stage.id)}
        {@const pos = layout.positions[i]}
        <g transform={`translate(${pos.x} ${pos.y})`} class:ready={stage.id === 'ready'}>
          <rect class="offset" x="3" y="4" width={pos.w} height="156" rx="6" />
          <rect class="node" width={pos.w} height="156" rx="6" />
          <path class="band" d={`M1 6Q1 1 6 1H${pos.w-6}Q${pos.w-1} 1 ${pos.w-1} 6V56H1Z`} />
          <text class="kind" x="16" y="23">{stage.kind}</text>
          <text class="step" x={pos.w-16} y="24" text-anchor="end">{stage.step}</text>
          <text class="node-title" x="16" y="45">{stage.title}</text>
          <path class="rule" d={`M1 56H${pos.w-1}`} />
          {#each stage.lines as line, n (line)}
            <text class="detail" x="16" y={80+n*22}>{line}</text>
          {/each}
          <path class="rule" d={`M16 120H${pos.w-16}`} />
          <text class="foot" x="16" y="142">{stage.foot}</text>
        </g>
      {/each}
    </svg>
  {/each}
  <figcaption>A revision stays with the same asset. Review feedback is shared; each take keeps its own media and creative metadata. Sharing always requires a separate choice.</figcaption>
</figure>

