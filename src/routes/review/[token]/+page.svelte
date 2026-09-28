<script lang="ts">let { data, form } = $props();</script>
<svelte:head><title>Private review · Review Room</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="same-origin" /></svelte:head>
<main class="shell">
  <header><p class="eyebrow">Private review</p><h1>{data.locked ? 'Enter your passcode' : data.project.project.title}</h1>
    {#if !data.locked && data.project.project.description}<p class="muted">{data.project.project.description}</p>{/if}</header>
  {#if data.locked}
    <form method="POST" action="?/unlock" class="panel gate">
      <label>Passcode <input type="password" name="passcode" autocomplete="off" required /></label>
      {#if form?.invalid}<p role="alert">Passcode not accepted. Try again later if this link is temporarily locked.</p>{/if}
      <button class="primary">Open review</button>
    </form>
  {:else}
    {#if data.reviewerName}<form method="POST" action="?/name" class="name-form"><label>Your review name <input name="displayName" value={data.reviewerName} maxlength="100" required /></label><button>Save name</button></form>{/if}
    {#if data.videos.length === 0}<p class="panel muted">No ready videos have been added to this review.</p>{/if}
    <div class="videos">
      {#each data.videos as video (video.id)}
        <section class="panel" id={video.id}>
          <div class="meta"><div><small>{video.assetCode ?? 'VIDEO'} · {video.status.replaceAll('_', ' ')}</small><h2>{video.title}</h2></div></div>
          <video controls preload="metadata" playsinline src={`/api/review-media/${data.token}/${video.id}`} aria-label={video.title}></video>
          <div class="feedback"><h3>Feedback</h3>
            {#each data.comments.find((entry) => entry.videoId === video.id)?.items ?? [] as comment (comment._id)}
              <article class="comment"><strong>{comment.authorName}</strong><p>{comment.body}</p></article>
            {/each}
            <form method="POST" action="?/comment" class="stack">
              <input type="hidden" name="videoId" value={video.id}/>
              <label>Comment <textarea name="body" rows="3" maxlength="5000" required></textarea></label>
              <button class="primary">Add comment</button>
            </form>
          </div>
        </section>
      {/each}
    </div>
  {/if}
</main>
<style>
  .shell{max-width:1040px;margin:0 auto;padding:clamp(20px,5vw,56px)}header{margin-bottom:28px}.eyebrow{color:var(--teal);font-size:12px;text-transform:uppercase;letter-spacing:.14em;margin-bottom:10px}.muted,small{color:var(--muted)}h1{font-size:clamp(28px,4vw,44px)}h2{font-size:21px}.panel{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:clamp(16px,3vw,26px)}.gate{max-width:460px;display:grid;gap:16px}.videos{display:grid;gap:24px}.meta{display:flex;justify-content:space-between;margin-bottom:16px}video{display:block;width:100%;max-height:70vh;background:#050606;border-radius:10px}.feedback{margin-top:24px}.feedback h3{margin-bottom:12px}.comment{padding:14px 0;border-bottom:1px solid var(--border)}.comment p{margin-top:5px;white-space:pre-wrap}.stack{display:grid;gap:12px;margin-top:18px}.name-form{display:flex;gap:12px;align-items:end;margin-bottom:24px}.name-form button{padding:11px}label{display:grid;gap:7px}input,textarea{background:var(--raised);color:var(--ink);padding:11px;border-radius:9px;border:1px solid var(--control-border)}button.primary{justify-self:start;background:var(--accent);padding:11px 17px;border-radius:9px;font-weight:700}
</style>
