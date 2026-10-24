<script lang="ts">
  import { resolve } from '$app/paths';
  import { FolderTree, Layers, Send, ArrowUpRight } from 'lucide-svelte';
  import DocsDiagram from '$lib/docs/DocsDiagram.svelte';
</script>
<svelte:head><title>Everyday workflow · Review Room</title><meta name="description" content="A visual guide from upload through review, take selection and deliberate sharing." /></svelte:head>
<header class="docs-heading"><p class="docs-kicker">Using Review Room</p><h1>From first upload<br />to the right take.</h1><p class="docs-lead">One place for the media, the feedback and the take you choose.</p></header>
<DocsDiagram kind="workflow" caption="Follow the arrows. Wait for Ready before reviewing; share only when you deliberately choose to. A revision stays with the same asset." />

<section><h2>Find your way around</h2><div class="docs-guide-index">
  <a href={resolve('/docs/organization')}><FolderTree size={36} strokeWidth={1}/><div><strong>Organize the work</strong><span>Project → real folders → asset → stored takes. See where every name comes from.</span></div><ArrowUpRight size={16}/></a>
  <a href={resolve('/docs/review')}><Layers size={36} strokeWidth={1}/><div><strong>Review and choose</strong><span>Feedback stays with the asset. Prompt, model and references stay with the take.</span></div><ArrowUpRight size={16}/></a>
  <a href={resolve('/docs/review')}><Send size={36} strokeWidth={1}/><div><strong>Share with the right audience</strong><span>A private review, a Trailer Feed publication and an embed grant different access.</span></div><ArrowUpRight size={16}/></a>
</div></section>

<section id="upload"><h2>Uploading: the short version</h2><div class="docs-upload-strip"><span>Choose destination</span><b aria-hidden="true">→</b><span>Add media</span><b aria-hidden="true">→</b><span>Follow Imports</span><b aria-hidden="true">→</b><strong>Ready</strong></div>
<details class="docs-disclosure"><summary>Upload steps, retries and revisions</summary><ol class="docs-steps"><li>Open the real folder or project root, then choose <strong>Add media</strong>. Check the destination before choosing files.</li><li>Drop or choose videos and images. Imports shows per-file progress. Cancel during preparation/transfer; Retry failed or cancelled work.</li><li>Wait for <strong>Ready</strong>. An upload receipt does not mean video thumbnails and scrub previews have finished processing. Activity tracks processing and safe retries.</li><li>A separate ordinary upload creates a separate asset. For take history, use an existing publication’s <strong>New version</strong> upload or the managed production/API take workflow.</li></ol></details></section>

<section id="delivery"><h2>Sharing is a choice, not an upload side effect</h2><DocsDiagram kind="sharing" caption="The audience and the permission change at each branch. New source uploads stay private; choosing a current take does not silently replace published work." /></section>
<details class="docs-disclosure"><summary>What do stars, shortlist and approval change?</summary><p>Stars and shortlist are independent review facets. <strong>Request changes</strong> and <strong>Approve</strong> express a review decision. Selecting a version inspects it; <strong>Make current</strong> changes the saved pick. None of these automatically publishes media.</p></details>
<aside class="docs-note"><strong>Working locally?</strong><p>An unconfigured checkout is a local preview. For persistent uploads, feedback and shared links, see the owner’s <a href={resolve('/docs/operations')}>connected setup</a>.</p></aside>
<footer class="docs-footer"><a href={resolve('/docs/organization')}>Next: Naming & organization</a><a href={resolve('/docs/agents')}>Working with an agent?</a></footer>
