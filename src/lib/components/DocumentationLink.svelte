<script lang="ts">
  import { resolve } from '$app/paths';
  import { BookOpen } from 'lucide-svelte';
</script>

<a class="documentation-link" href={resolve('/docs')} title="Documentation">
  <BookOpen size={14} strokeWidth={1.4} />
  <span>Docs</span>
</a>

<style>
  .documentation-link { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:32px; padding:5px 8px; border:1px solid var(--border); border-radius:5px; color:var(--muted); font-size:11px; text-decoration:none; }
  .documentation-link:hover { color:var(--ink); background:var(--raised); }
  @media (pointer:coarse) { .documentation-link { min-height:44px; } }
</style>
