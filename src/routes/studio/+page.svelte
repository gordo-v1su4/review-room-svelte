<script lang="ts">
  import ShowcaseEditor from '$lib/components/ShowcaseEditor.svelte';
  let { data } = $props();
  let uploadProject = $state('');
  let uploadAsset = $state('');
  let uploadFile: File | undefined = $state();
  let uploadState = $state('');
  let showcaseOrder = $state<string[]>([]);
  let showcasePick = $state('');

  const snapshot = $derived(data.snapshot);
  const activeProjects = $derived(snapshot.projects.filter((project) => !project.archived));
  const activePublications = $derived(snapshot.publications.filter((publication) => !publication.revokedAt));

  async function upload() {
    if (!uploadFile || !uploadProject) return;
    uploadState = 'Creating upload session…';
    try {
      const begin = await fetch('/api/uploads/begin', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: uploadProject, assetId: uploadAsset || undefined,
          name: uploadFile.name, type: uploadFile.type || 'video/mp4', size: uploadFile.size }) });
      if (!begin.ok) throw new Error(await begin.text());
      const session = await begin.json();
      uploadState = 'Uploading original…';
      const put = await fetch(session.url, { method: 'PUT', headers: { 'content-type': uploadFile.type || 'video/mp4' }, body: uploadFile });
      if (!put.ok) throw new Error(`Storage rejected the upload (${put.status}).`);
      uploadState = 'Verifying stored original…';
      const finish = await fetch('/api/uploads/complete', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId }) });
      if (!finish.ok) throw new Error(await finish.text());
      uploadState = 'Upload complete.';
      location.reload();
    } catch (cause) { uploadState = `Upload failed: ${cause instanceof Error ? cause.message : String(cause)}`; }
  }

  function move(index: number, offset: number) {
    const next = [...showcaseOrder]; const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    showcaseOrder = next;
  }
</script>

<svelte:head><title>Studio · Review Room</title><meta name="robots" content="noindex" /></svelte:head>
<main class="shell">
  <header class="top"><div><p class="eyebrow">Personal workspace · Stage 1</p><h1>Review Room</h1><p class="muted">One original, private review, and explicit publication.</p></div>
    <form method="POST" action="?/logout"><button class="quiet">Sign out</button></form></header>

  <section class="panel"><h2>Projects</h2>
    <form method="POST" action="?/createProject" class="row"><label>New project <input name="title" maxlength="120" required placeholder="Project title" /></label><label>Description <input name="description" maxlength="2000" placeholder="Optional" /></label><button class="primary">Create project</button></form>
    <div class="project-list">
      {#each snapshot.projects as project (project._id)}
        <details class="project" open={!project.archived}>
          <summary><strong>{project.title}</strong><span class="muted">{project.archived ? 'Archived' : 'Active'}</span></summary>
          <form method="POST" action="?/updateProject" class="row"><input type="hidden" name="projectId" value={project._id} /><label>Title <input name="title" value={project.title} required /></label><label>Description <input name="description" value={project.description ?? ''} /></label><button>Save details</button></form>
          <form method="POST" action="?/archiveProject"><input type="hidden" name="projectId" value={project._id}/><input type="hidden" name="archived" value={String(!project.archived)}/><button class="quiet">{project.archived ? 'Restore project' : 'Archive project'}</button></form>
        </details>
      {/each}
    </div>
  </section>

  <section class="panel"><h2>Canonical upload</h2><p class="muted">Upload one original per asset. A replacement adds a version; it does not create a second canonical asset.</p>
    <form class="row" onsubmit={(event) => { event.preventDefault(); void upload(); }}>
      <label>Project <select bind:value={uploadProject} required><option value="">Choose project</option>{#each activeProjects as project}<option value={project._id}>{project.title}</option>{/each}</select></label>
      <label>Replace approved asset <select bind:value={uploadAsset}><option value="">New asset</option>{#each snapshot.assets.filter((asset) => asset.projectId === uploadProject && asset.status === 'approved') as asset}<option value={asset._id}>{asset.title}</option>{/each}</select></label>
      <label>Video original <input type="file" accept="video/*" required onchange={(event) => { uploadFile = event.currentTarget.files?.[0]; }} /></label>
      <button class="primary" disabled={!uploadFile || !uploadProject}>Upload and verify</button>
    </form><p role="status">{uploadState}</p>
    <div class="asset-list">{#each snapshot.assets as asset (asset._id)}
      <article class="asset"><div><small>{snapshot.projects.find((project) => project._id === asset.projectId)?.title} · {asset.assetCode}</small><h3>{asset.title}</h3><p class="muted">{asset.status.replaceAll('_', ' ')} · {snapshot.versions.filter((version) => version.assetId === asset._id).length} version(s)</p></div>
        {#if asset.status !== 'approved' && asset.currentVersionId}<form method="POST" action="?/approveAsset"><input type="hidden" name="assetId" value={asset._id}/><button>Approve for publication</button></form>{/if}
      </article>
    {/each}</div>
  </section>

  <section class="panel"><h2>Private review links</h2>
    <form method="POST" action="?/createLink" class="row"><label>Project <select name="projectId" required><option value="">Choose project</option>{#each activeProjects as project}<option value={project._id}>{project.title}</option>{/each}</select></label><label>Passcode <input name="passcode" autocomplete="off" placeholder="Optional" /></label><label>Expires <input type="datetime-local" name="expiresAt" /></label><button class="primary">Create private link</button></form>
    <div class="asset-list">{#each snapshot.links as link (link._id)}
      <article class="asset"><div><small>{snapshot.projects.find((project) => project._id === link.projectId)?.title}</small><a href={`/review/${link.token}`}>Private review link</a><p class="muted">{link.revokedAt ? 'Revoked' : link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleString()}` : 'Active'}</p></div>
        {#if !link.revokedAt}<form method="POST" action="?/revokeLink"><input type="hidden" name="linkId" value={link._id}/><button class="danger">Revoke</button></form>{/if}
      </article>
    {/each}</div>
  </section>

  <section class="panel"><h2>Published video embeds</h2><p class="muted">Only an approved version can be published. Allowed sites are exact HTTPS origins.</p>
    {#each snapshot.assets.filter((asset) => asset.status === 'approved' && !snapshot.projects.find((project) => project._id === asset.projectId)?.archived) as asset (asset._id)}
      <form method="POST" action="?/publish" class="row compact"><input type="hidden" name="assetId" value={asset._id}/><label>{asset.title} · version <select name="versionId">{#each snapshot.versions.filter((version) => version.assetId === asset._id) as version}<option value={version._id}>{version.version}</option>{/each}</select></label><label>Allowed site origins <input name="origins" placeholder="https://example.com" required /></label><button>Publish video</button></form>
    {/each}
    <div class="asset-list">{#each snapshot.publications as publication (publication._id)}
      {@const asset = snapshot.assets.find((item) => item._id === publication.assetId)}
      <article class="asset"><div><h3>{asset?.title ?? 'Video'} <span class="muted">{publication.revokedAt ? '· Revoked' : ''}</span></h3><a href={`/embed/video/${publication.slug}`}>/embed/video/{publication.slug}</a><small>Allowed: {publication.allowedOrigins.join(', ')}</small></div>
        {#if !publication.revokedAt}<div class="actions"><form method="POST" action="?/replace" class="row"><input type="hidden" name="publicationId" value={publication._id}/><select name="versionId" aria-label="Replacement version">{#each snapshot.versions.filter((version) => version.assetId === publication.assetId) as version}<option value={version._id} selected={version._id === publication.versionId}>Version {version.version}</option>{/each}</select><button>Replace at URL</button></form><form method="POST" action="?/revokePublication"><input type="hidden" name="publicationId" value={publication._id}/><button class="danger">Revoke</button></form></div>{/if}
      </article>
    {/each}</div>
  </section>

  <section class="panel"><h2>Ordered showcase</h2><p class="muted">Add published videos from any project, then set their order.</p>
    <form method="POST" action="?/saveShowcase" class="stack"><label>Showcase title <input name="title" required maxlength="120" /></label><label>Allowed site origins <input name="origins" placeholder="https://example.com" required /></label>
      <div class="row"><label>Add video <select bind:value={showcasePick}><option value="">Choose published video</option>{#each activePublications as publication}<option value={publication._id}>{snapshot.assets.find((asset) => asset._id === publication.assetId)?.title}</option>{/each}</select></label><button type="button" onclick={() => { if (showcasePick && !showcaseOrder.includes(showcasePick)) showcaseOrder = [...showcaseOrder, showcasePick]; }}>Add</button></div>
      <ol class="order">{#each showcaseOrder as id, index (id)}<li><input type="hidden" name="publicationIds" value={id}/><span>{snapshot.assets.find((asset) => asset._id === snapshot.publications.find((publication) => publication._id === id)?.assetId)?.title}</span><button type="button" onclick={() => move(index, -1)} aria-label="Move up">↑</button><button type="button" onclick={() => move(index, 1)} aria-label="Move down">↓</button><button type="button" onclick={() => { showcaseOrder = showcaseOrder.filter((item) => item !== id); }}>Remove</button></li>{/each}</ol>
      <button class="primary">Save showcase</button>
    </form>
    <div class="asset-list">{#each snapshot.showcases as showcase}<article class="asset"><div><h3>{showcase.title}</h3><a href={`/embed/showcase/${showcase.slug}`}>/embed/showcase/{showcase.slug}</a><small>{showcase.publicationIds.length} video(s) · {showcase.allowedOrigins.join(', ')}</small></div></article><ShowcaseEditor {showcase} publications={snapshot.publications} assets={snapshot.assets} />{/each}</div>
  </section>
</main>
<style>
  .shell{max-width:1180px;margin:0 auto;padding:clamp(18px,4vw,54px);display:grid;gap:24px}.top{display:flex;align-items:start;justify-content:space-between;gap:16px}.eyebrow{font-size:12px;color:var(--teal);text-transform:uppercase;letter-spacing:.14em;margin-bottom:10px}h1{font-size:clamp(32px,5vw,50px)}h2{font-size:24px;margin-bottom:14px}h3{font-size:16px}.muted,small{color:var(--muted)}.muted{line-height:1.55}.panel{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:clamp(17px,3vw,26px)}.row{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin:16px 0}.row>label{flex:1;min-width:170px}.compact{border-bottom:1px solid var(--border);padding-bottom:15px}.stack{display:grid;gap:14px;margin-top:16px}.stack>.primary{justify-self:start}label{display:grid;gap:6px;font-size:13px;color:var(--muted)}input,select{width:100%;background:var(--raised);color:var(--ink);border:1px solid var(--control-border);border-radius:8px;padding:10px}button{border:1px solid var(--control-border);border-radius:8px;padding:10px 14px;background:var(--raised);white-space:nowrap}button.primary{background:var(--accent);color:var(--ink);font-weight:700}.quiet{background:transparent}.danger{color:#f09c93}.project-list,.asset-list{display:grid;margin-top:15px}.project,.asset{padding:16px 0;border-top:1px solid var(--border)}summary{cursor:pointer;display:flex;gap:14px;align-items:center}.asset{display:flex;justify-content:space-between;align-items:center;gap:15px}.asset h3{margin:3px 0}.asset small{margin-top:5px}.asset a{color:var(--teal);overflow-wrap:anywhere}.actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.order{padding-left:22px}.order li{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0}.order li span{flex:1;min-width:120px}@media(max-width:650px){.asset,.top{align-items:flex-start}.asset{flex-direction:column}.actions{width:100%}}
</style>
