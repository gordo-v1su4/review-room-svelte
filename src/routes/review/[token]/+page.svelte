<script lang="ts">
  import { onMount } from 'svelte';
  import { MessageSquare, Play } from 'lucide-svelte';
  import Player from '$lib/playback/Player.svelte';

  let { data, form } = $props();
  let selectedId = $state('');
  const selected = $derived(data.locked ? undefined : data.videos.find((video) => video.id === selectedId) ?? data.videos[0]);
  const comments = $derived(data.locked || !selected ? [] : data.comments.find((entry) => entry.videoId === selected.id)?.items ?? []);

  onMount(() => {
    if (!data.locked) {
      const hash = decodeURIComponent(location.hash.slice(1));
      if (data.videos.some((video) => video.id === hash)) selectedId = hash;
    }
  });
</script>

<svelte:head><title>Private review · Review Room</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="same-origin" /></svelte:head>
<main class="review-shell">
  <header class="review-header"><span class="brand">review room.</span><span class="private-label">Private review</span></header>
  {#if data.locked}
    <div class="gate-wrap">
      <div class="gate-heading"><p class="eyebrow">PRIVATE REVIEW</p><h1>Enter your passcode</h1><p>This link requires a passcode before media can be viewed.</p></div>
      <form method="POST" action="?/unlock" class="gate">
        <label>Passcode <input type="password" name="passcode" autocomplete="off" required /></label>
        {#if form?.invalid}<p role="alert">Passcode not accepted. Try again later if this link is temporarily locked.</p>{/if}
        <button class="primary">Open review</button>
      </form>
    </div>
  {:else}
    <div class="project-heading"><div><p class="eyebrow">SHARED PROJECT</p><h1>{data.project.project.title}</h1>{#if data.project.project.description}<p>{data.project.project.description}</p>{/if}</div></div>
    {#if data.reviewerName}<form method="POST" action="?/name" class="name-form"><label>Your review name <input name="displayName" value={data.reviewerName} maxlength="100" required /></label><button>Save name</button></form>{/if}
    {#if !data.videos.length}<p class="empty">No ready videos have been added to this review.</p>
    {:else}
      <div class="review-workspace">
        <nav class="media-explorer" aria-label="Review media"><div class="pane-heading">Media <span>{data.videos.length}</span></div>
          {#each data.videos as video (video.id)}
            <button class="media-row" class:chosen={selected?.id === video.id} aria-current={selected?.id === video.id ? 'true' : undefined} onclick={() => { selectedId = video.id; history.replaceState(null, '', `#${video.id}`); }}>
              <span class="poster">{#if video.hasPoster}<img src={`/api/review-poster/${data.token}/${video.id}`} alt="" />{:else}<Play size={18} aria-hidden="true" />{/if}</span>
              <span class="media-copy"><strong>{video.title}</strong><small>{video.assetCode ?? 'VIDEO'} · {video.status.replaceAll('_', ' ')}</small></span>
              {#if video.commentCount}<span class="comment-count" aria-label={`${video.commentCount} comments`}><MessageSquare size={12} aria-hidden="true" />{video.commentCount}</span>{/if}
            </button>
          {/each}
        </nav>
        {#if selected}<section class="viewer" aria-label="Selected video review"><div class="pane-heading">{selected.title}</div><Player src={`/api/review-media/${data.token}/${selected.id}`} name={selected.title} />
          <div class="video-meta"><span>{selected.assetCode ?? 'VIDEO'}</span><span>{selected.status.replaceAll('_', ' ')}</span></div>
        </section>
        <aside class="feedback" aria-label="Feedback"><div class="pane-heading">Notes <span>{comments.length}</span></div>
          <div class="comment-list">{#each comments as comment (comment._id)}<article class="comment"><strong>{comment.authorName}</strong><p>{comment.body}</p></article>{:else}<p class="empty-note">No notes yet.</p>{/each}</div>
          <form method="POST" action="?/comment" class="comment-form"><input type="hidden" name="videoId" value={selected.id}/><label>Comment <textarea name="body" rows="3" maxlength="5000" required placeholder="Leave a note…"></textarea></label>{#if form?.commentInvalid}<p role="alert">Write a comment before posting.</p>{/if}<button class="primary">Add comment</button></form>
        </aside>{/if}
      </div>
    {/if}
  {/if}
</main>

<style>
  .review-shell{min-height:100svh;background:linear-gradient(125deg,#14191a 0%,#0d1112 25%,#090b0c 60%);color:var(--ink)}
  .review-header{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--border)}
  .brand{font-size:18px;font-weight:600;letter-spacing:-.8px}.private-label,.eyebrow{color:var(--muted);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
  .project-heading{padding:24px 28px 18px}.project-heading h1,.gate-heading h1{margin:5px 0 0;font-size:24px;font-weight:550;letter-spacing:-.7px}.project-heading p:last-child,.gate-heading p:last-child{margin:7px 0 0;color:var(--muted);font-size:12px}
  .review-workspace{display:grid;grid-template-columns:minmax(210px,1fr) minmax(320px,2fr) minmax(240px,1fr);gap:8px;padding:0 20px 24px;align-items:start}.media-explorer,.viewer,.feedback{min-width:0;min-height:450px;padding:12px;background:color-mix(in srgb,var(--panel) 48%,transparent);border:1px solid var(--border);border-radius:6px}.pane-heading{display:flex;align-items:center;gap:8px;min-height:32px;margin-bottom:12px;padding:0 2px 9px;border-bottom:1px solid var(--border);font-size:12px;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pane-heading span{color:var(--muted);font-size:10px}
  .media-row{display:flex;align-items:center;gap:9px;width:100%;min-height:65px;margin:3px 0;padding:5px;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--ink);text-align:left;cursor:pointer}.media-row:hover{background:var(--raised)}.media-row.chosen{background:linear-gradient(105deg,#263b35,#17211e);border-color:#a3d6c41c}.poster{display:grid;place-items:center;flex:none;width:74px;aspect-ratio:16/10;overflow:hidden;border-radius:3px;background:#202829;color:var(--muted)}.poster img{width:100%;height:100%;object-fit:cover}.media-copy{display:grid;gap:5px;min-width:0}.media-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:550}.media-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:9px}.comment-count{display:flex;gap:3px;align-items:center;margin-left:auto;color:var(--muted);font-size:10px}
  .viewer{padding:12px 14px}.video-meta{display:flex;justify-content:space-between;gap:10px;margin-top:10px;color:var(--muted);font-size:10px}.feedback{display:flex;flex-direction:column}.comment-list{flex:1}.comment{padding:10px 2px;border-bottom:1px solid var(--border)}.comment strong{font-size:11px;font-weight:550}.comment p{margin:6px 0 0;white-space:pre-wrap;font-size:12px;line-height:1.5}.empty-note{color:var(--muted);font-size:11px}.comment-form{display:grid;gap:10px;margin-top:16px}.comment-form label,.gate label,.name-form label{display:grid;gap:7px;color:var(--muted);font-size:11px}.comment-form textarea,.gate input,.name-form input{width:100%;padding:10px;border:1px solid var(--control-border);border-radius:4px;background:var(--canvas);color:var(--ink);font:inherit;font-size:12px}.comment-form textarea{resize:vertical}.comment-form button,.gate button,.name-form button{justify-self:start;min-height:34px;padding:0 12px;border:1px solid var(--control-border);border-radius:4px;background:linear-gradient(165deg,#2c5046,#192e29);color:var(--ink);font:inherit;font-size:11px;cursor:pointer}.comment-form [role=alert],.gate [role=alert]{color:#e5a59b;font-size:11px}
  .gate-wrap{max-width:460px;margin:clamp(35px,8vh,100px) auto;padding:0 20px}.gate{display:grid;gap:18px;margin-top:24px;padding:20px;border:1px solid var(--border);border-radius:6px;background:var(--panel)}.name-form{display:flex;align-items:end;gap:8px;padding:0 28px 18px}.name-form input{min-width:180px}.empty{padding:20px 28px;color:var(--muted);font-size:12px}
  @media(max-width:1100px){.review-workspace{grid-template-columns:minmax(190px,1fr) minmax(320px,2fr)}.feedback{grid-column:2;min-height:0}}
  @media(max-width:760px){.review-header{padding-inline:16px}.project-heading{padding:20px 16px}.review-workspace{display:flex;flex-direction:column;padding:0 10px 20px}.media-explorer,.viewer,.feedback{width:100%;min-height:0}.media-explorer{display:flex;gap:5px;overflow-x:auto}.media-explorer .pane-heading{display:none}.media-row{flex:none;width:200px}.name-form{padding-inline:16px}.viewer{order:0}.media-explorer{order:1}.feedback{order:2}}
  @media(pointer:coarse){.media-row,.comment-form button,.gate button,.name-form button{min-height:44px}}
</style>
