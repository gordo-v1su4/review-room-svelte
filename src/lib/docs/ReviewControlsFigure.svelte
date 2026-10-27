<script lang="ts">
  import { Layers, BadgeCheck, MessageSquareText } from 'lucide-svelte';

  const places = [
    { id: 'take', title: 'The take', Icon: Layers, copy: 'Choose the version to inspect. Make current changes the saved pick.', images: [{ src: 'review-version-detail-20261026-2x.png', width: 340, height: 216, alt: 'The open Asset version menu, with V1 selected.' }] },
    { id: 'decision', title: 'The decision', Icon: BadgeCheck, copy: 'Shortlist, stars, Request changes and Approve are independent controls.', images: [{ src: 'review-rating-detail-20261026-2x.png', width: 400, height: 88, alt: 'Shortlist and five-star rating controls.' }, { src: 'review-approval-detail-20261026-2x.png', width: 456, height: 88, alt: 'Request changes and Approve controls.' }] },
    { id: 'context', title: 'The context', Icon: MessageSquareText, copy: 'Notes holds feedback; Fields holds version metadata.', images: [{ src: 'review-context-detail-20261026-2x.png', width: 592, height: 524, alt: 'Notes and Fields tabs above the note composer.' }] }
  ];
  let hovered = $state<string | null>(null);
  let focused = $state<string | null>(null);
  let pinned = $state<string | null>(null);
  const active = $derived(hovered ?? focused ?? pinned);
  function close() { hovered = null; focused = null; pinned = null; }
</script>

<svelte:window onclick={(event) => { if (event.target instanceof Element && !event.target.closest('.review-hotspot')) close(); }} onkeydown={(event) => { if (event.key === 'Escape') close(); }} />

<figure class="review-figure">
  <div class="review-stage">
    <img class="review-image" src="/docs/images/review-expanded-20261026-2x.png" width="2128" height="1240" alt="Expanded owner review showing the full title VID_20261005_00023, V1 selected, rating and decision controls below, and Notes and Fields on the right." />
    {#each places as place (place.id)}
      <div class={`review-hotspot hotspot-${place.id}`} role="presentation"
        onpointerenter={(event) => { if (event.pointerType === 'mouse') hovered = place.id; }}
        onpointerleave={() => { if (hovered === place.id) hovered = null; }}
        onfocusin={() => { focused = place.id; }}
        onfocusout={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && focused === place.id) focused = null; }}>
        <button type="button" class="review-marker" aria-label={`Explore ${place.title.toLowerCase()}`} aria-expanded={active === place.id} aria-controls={`review-preview-${place.id}`}
          onclick={() => { if (pinned === place.id) close(); else pinned = place.id; }}>
          <place.Icon size={19} strokeWidth={1.5} aria-hidden="true" />
          <span class="mobile-label">{place.title}</span>
        </button>
        <div id={`review-preview-${place.id}`} class="review-preview" class:preview-open={active === place.id} role="region" aria-label={`${place.title} enlarged preview`} hidden={active !== place.id}>
          <div class="preview-heading"><place.Icon size={32} strokeWidth={1.5} aria-hidden="true" /><strong>{place.title}</strong></div>
          <p>{place.copy}</p>
          <div class={`preview-images preview-images-${place.id}`}>
            {#each place.images as detail (detail.src)}<img src={`/docs/images/${detail.src}`} width={detail.width} height={detail.height} alt={detail.alt} />{/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
  <div class="review-captions">
    {#each places as place (place.id)}<p><strong><place.Icon size={18} strokeWidth={1.5} aria-hidden="true" />{place.title}</strong>{place.copy}</p>{/each}
  </div>
  <figcaption>Hover, focus or tap an icon for a closer look. Current owner controls, captured at double resolution on October 26. Reviewers see fewer controls; smaller screens rearrange the same review work.</figcaption>
</figure>

<style>
  .review-figure{margin:30px 0 40px;max-width:1064px;background:var(--panel);border:0;border-radius:6px}
  .review-stage{position:relative;background:#000;border-radius:6px 6px 0 0}
  .review-image{display:block;width:100%;height:auto;border-radius:inherit}
  .review-hotspot{position:absolute;width:0;height:0;z-index:2}
  .review-hotspot:has(.preview-open){z-index:3}
  .hotspot-take{left:33.65%;top:2.58%}.hotspot-decision{left:19.55%;top:95.48%}.hotspot-context{left:88.35%;top:3.87%}
  .review-marker{display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;border-radius:5px;background:#101919;color:var(--teal);cursor:pointer;transform:translate(-50%,-50%);box-shadow:0 3px 12px #0008}
  .review-marker:hover,.review-marker[aria-expanded="true"]{background:#203a34;color:#a8f1e1}
  .review-marker:focus-visible{outline:2px solid var(--teal);outline-offset:3px}
  .mobile-label{display:none}
  .review-preview{position:absolute;top:16px;left:-16px;width:320px;box-sizing:border-box;padding:18px;background:#111919;color:var(--ink);border:0;border-radius:6px;box-shadow:0 12px 40px #000b;cursor:default}
  .review-preview[hidden]{display:none}
  .hotspot-decision .review-preview{top:auto;bottom:16px}
  .hotspot-context .review-preview{left:auto;right:-16px}
  .preview-heading{display:flex;align-items:center;gap:12px;font-size:15px}.preview-heading :global(svg){color:var(--teal);flex:none}
  .review-preview p{margin:12px 0 16px;font-size:13px;line-height:1.6;color:var(--muted)}
  .preview-images{display:grid;gap:8px;justify-items:start}.preview-images img{display:block;width:100%;height:auto;border:0;border-radius:3px}
  .preview-images-take img{width:200px;max-width:100%}
  .review-captions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;padding:22px}
  .review-captions p{margin:0;font-size:12px;line-height:1.75;color:var(--muted)}
  .review-captions strong{display:flex;align-items:center;gap:10px;margin-bottom:8px;color:var(--ink);font-size:13px}.review-captions :global(svg){flex:none;color:var(--teal)}
  figcaption{padding:0 22px 20px;font-size:12px;line-height:1.75;color:var(--muted)}
  @media(max-width:1100px){
    .review-stage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
    .review-image{grid-column:1/-1}
    .review-hotspot{position:relative;left:auto;top:auto;width:auto;height:auto;display:flex;justify-content:center;padding:8px 0}
    .review-marker{width:100%;min-height:54px;height:auto;flex-direction:column;gap:5px;transform:none;background:#0b1110;box-shadow:none}
    .mobile-label{display:block;font-size:11px}
    .review-preview,.hotspot-decision .review-preview{top:100%;bottom:auto;left:0;width:min(320px,calc(100vw - 56px));padding:16px}
    .hotspot-decision .review-preview{left:50%;transform:translateX(-50%)}
    .hotspot-context .review-preview{left:auto;right:0}
    .review-captions{grid-template-columns:1fr;gap:16px;padding:20px 16px}
    figcaption{padding:0 16px 20px}
  }
</style>
