<script lang="ts">
  import { resolve } from '$app/paths';
  import { ArrowLeft, ArrowUpRight, Network, Workflow } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Documentation · Review Room</title>
  <meta name="description" content="Review Room media flow and metadata relationships." />
</svelte:head>

<main class="documentation">
  <a class="back" href={resolve('/')}><ArrowLeft size={14} strokeWidth={1.4} /> Back to workspace</a>
  <p class="eyebrow">Review Room</p>
  <h1>Documentation</h1>
  <p class="intro">How media moves through the system, and how the information around it stays connected.</p>
  <div class="guides">
    <a class="guide" href={resolve('/docs/[diagram]', { diagram: 'media-flow.html' })}>
      <Workflow size={20} strokeWidth={1.2} />
      <div><h2>Media flow</h2><p>Follow upload, processing, review and publishing. Play the sequence or step through it.</p></div>
      <ArrowUpRight size={15} strokeWidth={1.4} />
    </a>
    <a class="guide" href={resolve('/docs/[diagram]', { diagram: 'metadata-model.html' })}>
      <Network size={20} strokeWidth={1.2} />
      <div><h2>Metadata relationships</h2><p>Explore projects, folders, assets, versions, feedback and publication access.</p></div>
      <ArrowUpRight size={15} strokeWidth={1.4} />
    </a>
  </div>
</main>

<style>
  .documentation { max-width:880px; margin:0 auto; padding:40px 24px; }
  .back { display:inline-flex; align-items:center; gap:8px; color:var(--muted); font-size:12px; text-decoration:none; }
  .back:hover { color:var(--ink); }
  .eyebrow { margin:48px 0 10px; color:var(--teal); font-size:10px; letter-spacing:.16em; text-transform:uppercase; }
  h1 { margin:0; font-size:28px; font-weight:450; letter-spacing:-.025em; }
  .intro { max-width:580px; margin:14px 0 30px; color:var(--muted); font-size:13px; line-height:1.7; }
  .guides { border-top:1px solid var(--border); }
  .guide { display:flex; align-items:center; gap:18px; padding:24px 0; border-bottom:1px solid var(--border); text-decoration:none; color:var(--ink); }
  .guide:hover { color:var(--teal); }
  .guide div { flex:1; }
  h2 { margin:0 0 7px; font-size:14px; font-weight:500; }
  .guide p { max-width:580px; margin:0; color:var(--muted); font-size:12px; line-height:1.7; }
</style>
