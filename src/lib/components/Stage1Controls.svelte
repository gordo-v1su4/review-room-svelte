<script lang="ts">
  import { onDestroy, onMount, getContext } from 'svelte';
  import { ACTIVITY_CONTEXT, type ActivityFeed, type ActivityItem } from '$lib/work-activity';
  import { uploadWithProgress } from '$lib/upload-progress';
  const activityFeed = getContext<ActivityFeed | undefined>(ACTIVITY_CONTEXT);
  import { Tabs } from 'bits-ui';
  import { createThumbnailExtractor } from '$lib/playback/thumbnails';
  import ShowcaseEditor from '$lib/components/ShowcaseEditor.svelte';
  import DestinationSyncDialog from './DestinationSyncDialog.svelte';
  import Stage1Select from '$lib/components/Stage1Select.svelte';
  import Stage1ExpiryPicker from '$lib/components/Stage1ExpiryPicker.svelte';
  import type { FunctionReturnType } from 'convex/server';
  import { internal } from '../../../convex/_generated/api';
  type Snapshot = FunctionReturnType<typeof internal.personal.snapshot>;
  let { snapshot, destinationContext, uploadContext }: { snapshot: Snapshot; destinationContext?: {projectId:string;folderId:string|null;selectedVersionIds:string[]}; uploadContext?: {folders:readonly {id:string;title:string}[];folderId:string|null;assetClass:'VID'|'IMG'|'CTX'|'STB';onChange:(value:{folderId:string|null;assetClass:'VID'|'IMG'|'CTX'|'STB'})=>void;onChoose:()=>void} } = $props();
  let showcaseOrder = $state<string[]>([]);
  let showcasePick = $state('');
  let sharingTab = $state('reviews');
  let destinationProject = $state('');
  const destinationProjectId = $derived(destinationProject || destinationContext?.projectId || '');
  let tabReady = $state(false);
  let uploadMessage = $state('');
  let uploading = $state(false);
  const thumbnails = createThumbnailExtractor({ concurrency: 1 });

  onMount(() => { const saved = sessionStorage.getItem('review-room.sharing-tab'); sharingTab = saved === 'trailer' ? 'destinations' : saved ?? 'reviews'; tabReady = true; });
  $effect(() => { if (tabReady) sessionStorage.setItem('review-room.sharing-tab', sharingTab); });
  onDestroy(() => thumbnails.dispose());

  async function uploadVersion(file: File, projectId: string, assetId: string) {
    if (uploading) return;
    uploading = true;
    const item: ActivityItem = { id: `upload:${crypto.randomUUID()}`, kind: 'upload', label: file.name,
      project: snapshot.projects.find(project => project._id === projectId)?.title ?? 'Project', projectId, assetId,
      state: 'running', stage: 'Preparing preview', updatedAt: Date.now() };
    const report = (stage: string, progress?: number) => activityFeed?.upsert({ ...item, stage, progress, updatedAt: Date.now() });
    report('Preparing preview');
    try {
      if (!file.type.startsWith('video/')) throw new Error('Choose a video file.');
      uploadMessage = `Preparing ${file.name}…`;
      const preview = await thumbnails.extract(file);
      const begin = await fetch('/api/uploads/begin', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId, assetId, name: file.name, type: file.type, size: file.size }) });
      if (!begin.ok) throw new Error(`Could not start upload (${begin.status}).`);
      const session = await begin.json();
      uploadMessage = `Uploading ${file.name}…`;
      report('Uploading original', 0);
      await uploadWithProgress(session.url, file, percent => report('Uploading original', percent));
      report('Uploading preview');
      const poster = await fetch(session.posterUrl, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: preview.blob });
      if (!poster.ok) throw new Error(`Storage rejected the poster (${poster.status}).`);
      uploadMessage = `Verifying ${file.name}…`;
      report('Verifying upload');
      const finish = await fetch('/api/uploads/complete', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, posterSizeBytes: preview.blob.size,
          durationSec: preview.duration, width: preview.sourceWidth, height: preview.sourceHeight }) });
      if (!finish.ok) throw new Error(`Could not verify upload (${finish.status}).`);
      activityFeed?.upsert({ ...item, state: 'complete', stage: 'Uploaded · queued for ingest', updatedAt: Date.now() });
      location.assign('/?sharing=1');
    } catch (cause) {
      uploadMessage = cause instanceof Error ? cause.message : 'Could not upload this version.';
      activityFeed?.upsert({ ...item, state: 'failed', stage: 'Upload needs attention · check project before retrying', updatedAt: Date.now() });
    } finally { uploading = false; }
  }

  const activeProjects = $derived(snapshot.projects.filter((project) => !project.archived));
  const activePublications = $derived(snapshot.publications.filter((publication) => !publication.revokedAt));
  const activeLinks = $derived(snapshot.links.filter((link) => !link.revokedAt));
  const revokedLinks = $derived(snapshot.links.filter((link) => !!link.revokedAt));

  function move(index: number, offset: number) {
    const next = [...showcaseOrder]; const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    showcaseOrder = next;
  }
</script>

<Tabs.Root bind:value={sharingTab} class="shell">
  <Tabs.List class="sharing-tabs" aria-label="Sharing options">
    {#if uploadContext}<Tabs.Trigger value="upload">Upload</Tabs.Trigger>{/if}
    <Tabs.Trigger value="reviews">Private review</Tabs.Trigger>
    <Tabs.Trigger value="embeds">Video embeds</Tabs.Trigger>
    <Tabs.Trigger value="showcase">Showcase</Tabs.Trigger>
    {#if destinationContext}<Tabs.Trigger value="destinations">Destinations</Tabs.Trigger>{/if}
  </Tabs.List>

  {#if destinationContext}<Tabs.Content value="destinations" class="panel"><h2>Destinations</h2><div class="stack"><div class="field">Destination<Stage1Select label="Destination app" value="trailer-feed" items={[{value:'trailer-feed',label:'Trailer Feed'}]}/></div><div class="field">Project<Stage1Select label="Destination source project" value={destinationProjectId} items={activeProjects.map(project => ({value:project._id,label:project.title}))} onValueChange={value => destinationProject = value}/></div></div>{#key destinationProjectId}<DestinationSyncDialog embedded open={sharingTab === "destinations"} projectId={destinationProjectId} folderId={destinationProjectId === destinationContext.projectId ? destinationContext.folderId : null} selectedVersionIds={destinationProjectId === destinationContext.projectId ? destinationContext.selectedVersionIds : []}/>{/key}</Tabs.Content>{/if}

  {#if uploadContext}<Tabs.Content value="upload" class="panel"><h2>Upload media</h2><p class="muted">Add videos and images to this project.</p><div class="stack"><div class="field">Destination<Stage1Select label="Upload destination" value={uploadContext.folderId ?? '__root__'} items={[{value:'__root__',label:'Project root'},...uploadContext.folders.map(folder => ({value:folder.id,label:folder.title}))]} onValueChange={value => uploadContext?.onChange({folderId:value === '__root__' ? null : value,assetClass:uploadContext.assetClass})}/></div><div class="field">Image classification<Stage1Select label="Image classification" value={uploadContext.assetClass === 'VID' ? 'IMG' : uploadContext.assetClass} items={[{value:'IMG',label:'Images'},{value:'CTX',label:'Contact sheets'},{value:'STB',label:'Storyboards'}]} onValueChange={value => { if(value === 'IMG' || value === 'CTX' || value === 'STB') uploadContext?.onChange({folderId:uploadContext.folderId,assetClass:value}); }}/></div><p class="muted">Videos keep their video type. Files are saved privately to your workspace.</p><button class="primary" onclick={() => uploadContext?.onChoose()}>Choose videos and images</button></div></Tabs.Content>{/if}

  <Tabs.Content value="reviews" class="panel"><h2>Private review links</h2>
    <form method="POST" action="/studio?/createLink" class="row"><div class="field"><span>Project</span><Stage1Select name="projectId" label="Project" items={activeProjects.map((project) => ({ value: project._id, label: project.title }))} placeholder="Choose project" required /></div><label>Passcode <input name="passcode" autocomplete="off" placeholder="Optional" /></label><div class="field"><span>Expires</span><Stage1ExpiryPicker /></div><button class="primary">Create private link</button></form>
    <div class="asset-list">{#each activeLinks as link (link._id)}
      <article class="asset"><div><small>{snapshot.projects.find((project) => project._id === link.projectId)?.title}</small><a href={`/review/${link.token}`}>Private review link</a><p class="muted">{link.revokedAt ? 'Revoked' : link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleString()}` : 'Active'}</p></div>
        {#if !link.revokedAt}<form method="POST" action="/studio?/revokeLink"><input type="hidden" name="linkId" value={link._id}/><button class="danger">Revoke</button></form>{/if}
      </article>
    {/each}</div>
    {#if activeLinks.length === 0}<p class="empty">No active review links.</p>{/if}
    {#if revokedLinks.length > 0}<details class="history"><summary>Revoked links ({revokedLinks.length})</summary><div class="asset-list">{#each revokedLinks as link (link._id)}<article class="asset"><div><small>{snapshot.projects.find((project) => project._id === link.projectId)?.title}</small><a href={`/review/${link.token}`}>Private review link</a><p class="muted">Revoked</p></div></article>{/each}</div></details>{/if}
  </Tabs.Content>

  <Tabs.Content value="embeds" class="panel"><h2>Published video embeds</h2><p class="muted">Only an approved version can be published. Allowed sites are exact HTTPS origins.</p>
    {#if uploadMessage}<p class="upload-message" role="status">{uploadMessage}</p>{/if}
    {#each snapshot.assets.filter((asset) => asset.status === 'approved' && !snapshot.projects.find((project) => project._id === asset.projectId)?.archived) as asset (asset._id)}
      <form method="POST" action="/studio?/publish" class="row compact"><input type="hidden" name="assetId" value={asset._id}/><div class="field"><span>{asset.title} · version</span><Stage1Select name="versionId" label="Video version" items={snapshot.versions.filter((version) => version.assetId === asset._id).map((version) => ({ value: version._id, label: String(version.version) }))} value={snapshot.versions.find((version) => version.assetId === asset._id)?._id ?? ''} required /></div><label>Allowed site origins <input name="origins" placeholder="https://example.com" required /></label><button>Publish video</button></form>
    {/each}
    <div class="asset-list">{#each snapshot.publications as publication (publication._id)}
      {@const asset = snapshot.assets.find((item) => item._id === publication.assetId)}
      <article class="asset"><div><h3>{asset?.title ?? 'Video'} <span class="muted">{publication.revokedAt ? '· Revoked' : ''}</span></h3><a href={`/embed/video/${publication.slug}`}>/embed/video/{publication.slug}</a><small>Allowed: {publication.allowedOrigins.join(', ')}</small></div>
        {#if !publication.revokedAt}<div class="actions"><label class="version-upload" aria-label={`Upload new version of ${asset?.title ?? 'video'}`}>New version<input type="file" accept="video/*" disabled={uploading} onchange={(event) => { const file = event.currentTarget.files?.[0]; if (file && asset) void uploadVersion(file, asset.projectId, asset._id); }} /></label><form method="POST" action="/studio?/replace" class="row"><input type="hidden" name="publicationId" value={publication._id}/><Stage1Select name="versionId" label="Replacement version" items={snapshot.versions.filter((version) => version.assetId === publication.assetId).map((version) => ({ value: version._id, label: `Version ${version.version}` }))} value={publication.versionId} required /><button>Replace at URL</button></form><form method="POST" action="/studio?/revokePublication"><input type="hidden" name="publicationId" value={publication._id}/><button class="danger">Revoke</button></form></div>{/if}
      </article>
    {/each}</div>
  </Tabs.Content>

  <Tabs.Content value="showcase" class="panel"><h2>Ordered showcase</h2><p class="muted">Add published videos from any project, then set their order.</p>
    <form method="POST" action="/studio?/saveShowcase" class="stack"><label>Showcase title <input name="title" required maxlength="120" /></label><label>Allowed site origins <input name="origins" placeholder="https://example.com" required /></label>
      <div class="row"><div class="field"><span>Add video</span><Stage1Select label="Add video" items={activePublications.map((publication) => ({ value: publication._id, label: snapshot.assets.find((asset) => asset._id === publication.assetId)?.title ?? 'Video' }))} placeholder="Choose published video" bind:value={showcasePick} /></div><button type="button" onclick={() => { if (showcasePick && !showcaseOrder.includes(showcasePick)) showcaseOrder = [...showcaseOrder, showcasePick]; }}>Add</button></div>
      <ol class="order">{#each showcaseOrder as id, index (id)}<li><input type="hidden" name="publicationIds" value={id}/><span>{snapshot.assets.find((asset) => asset._id === snapshot.publications.find((publication) => publication._id === id)?.assetId)?.title}</span><button type="button" onclick={() => move(index, -1)} aria-label="Move up">↑</button><button type="button" onclick={() => move(index, 1)} aria-label="Move down">↓</button><button type="button" onclick={() => { showcaseOrder = showcaseOrder.filter((item) => item !== id); }}>Remove</button></li>{/each}</ol>
      <button class="primary">Save showcase</button>
    </form>
    <div class="asset-list">{#each snapshot.showcases as showcase}<article class="asset"><div><h3>{showcase.title}</h3><a href={`/embed/showcase/${showcase.slug}`}>/embed/showcase/{showcase.slug}</a><small>{showcase.publicationIds.length} video(s) · {showcase.allowedOrigins.join(', ')}</small></div></article><ShowcaseEditor {showcase} publications={snapshot.publications} assets={snapshot.assets} />{/each}</div>
  </Tabs.Content>
  <form method="POST" action="/studio?/logout"><button class="quiet">Sign out</button></form>
</Tabs.Root>
<style>
  :global(.shell) { display:grid;gap:12px;min-width:0; }
  :global(.sharing-tabs) { display:flex;flex-wrap:wrap;gap:6px;padding-bottom:10px;border-bottom:1px solid var(--border); }
  :global(.sharing-tabs button) { display:inline-flex;align-items:center;min-height:28px;padding:0 9px;border:1px solid transparent;border-radius:4px;color:var(--muted);background:transparent;font-size:11px;white-space:nowrap; }
  :global(.sharing-tabs button[data-state='active']) { color:var(--ink);border-color:color-mix(in srgb,var(--accent) 24%,var(--border));background:color-mix(in srgb,var(--canvas) 85%,transparent); }
  :global(.panel) { min-width:0; }
  h2 { margin:2px 0 12px;font-size:14px;font-weight:550; }
  h3 { margin:2px 0;font-size:12px;font-weight:500; }
  .muted,small,.empty { color:var(--muted);font-size:11px;line-height:1.5; }
  .muted,.empty { margin:4px 0; }
  .row,.stack { display:grid;gap:12px;margin:0; }
  .row > button { justify-self:start; }
  .row.compact { padding:12px 0;border-top:1px solid var(--border); }
  label,.field { display:grid;gap:6px;min-width:0;color:var(--muted);font-size:11px; }
  input { width:100%;min-width:0;height:28px;padding:0 9px;border:1px solid var(--border);border-radius:5px;background:var(--canvas);color:var(--ink);color-scheme:dark;font:inherit;font-size:12px; }
  button { display:inline-flex;align-items:center;justify-content:center;min-height:28px;padding:0 10px;border:1px solid var(--border);border-radius:5px;background:var(--raised);color:var(--ink);font:inherit;font-size:11px;cursor:pointer; }
  button.primary { justify-self:start;background:color-mix(in srgb,var(--accent) 22%,var(--panel)); }
  button.danger { color:var(--status-needs-changes,#e6a2a2); }
  button.quiet { justify-self:start;padding:0;border:0;background:transparent;color:var(--muted); }
  .asset-list { display:grid;margin-top:12px; }
  .asset { display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;padding:10px 0;border-top:1px solid var(--border); }
  .asset > div:first-child { display:grid;gap:2px;min-width:0; }
  .asset a { color:var(--teal);font-size:11px;overflow-wrap:anywhere; }
  .asset small { display:block; }
  .actions { display:flex;align-items:center;gap:6px;flex-wrap:wrap; }
  .actions .row { display:flex;align-items:center;gap:6px; }
  .version-upload { display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border:1px solid var(--border);border-radius:5px;background:var(--raised);color:var(--ink);font-size:11px;cursor:pointer; }
  .version-upload input { position:absolute;width:1px;height:1px;padding:0;opacity:0;pointer-events:none; }
  .upload-message { color:var(--muted);font-size:11px; }
  .history { margin-top:12px;padding-top:10px;border-top:1px solid var(--border); }
  .history summary { color:var(--muted);font-size:11px;cursor:pointer; }
  :global(.shell) > form:last-child { padding-top:10px;border-top:1px solid var(--border); }
  .order { display:grid;gap:6px;margin:0;padding-left:18px; }
  .order li { display:flex;align-items:center;gap:5px; }
  .order li span { flex:1;min-width:0;font-size:11px;overflow-wrap:anywhere; }
  button:focus-visible,input:focus-visible,summary:focus-visible,:global(.sharing-tabs button:focus-visible) { outline:1px solid var(--accent);outline-offset:2px; }
  @media(pointer:coarse) { button,input,:global(.sharing-tabs button) { min-height:44px; } input { font-size:16px; } }
</style>
