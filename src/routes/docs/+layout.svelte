<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { ArrowLeft, BookOpen, LockKeyhole } from 'lucide-svelte';
  import './docs.css';
  let { children } = $props();
  let menuOpen = $state(false);
  const groups = [
    { title: 'Using Review Room', links: [
      { href: '/docs', title: 'Everyday workflow' },
      { href: '/docs/organization', title: 'Naming & organization' },
      { href: '/docs/review', title: 'Review, versions & sharing' },
    ] },
    { title: 'Reference', links: [
      { href: '/docs/agents', title: 'Agents & API' },
      { href: '/docs/media-flow.html', title: 'Media flow diagram' },
      { href: '/docs/metadata-model.html', title: 'Metadata relationships' },
    ] },
    { title: 'Owner', links: [{ href: '/docs/operations', title: 'Operations', private: true }] },
  ] as const;
</script>
<div class="docs-shell">
  <a class="docs-skip" href="#guide">Skip to guide</a>
  <header class="docs-mobile"><a href={resolve('/docs')}><BookOpen size={16} /> Documentation</a><button type="button" aria-expanded={menuOpen} aria-controls="docs-navigation" onclick={() => menuOpen = !menuOpen}>Sections</button></header>
  <aside class:open={menuOpen}>
    <a class="docs-back" href={resolve('/')}><ArrowLeft size={14} /> Workspace</a>
    <a class="docs-identity" href={resolve('/docs')}><BookOpen size={19} strokeWidth={1.3} /> Documentation</a>
    <nav id="docs-navigation" aria-label="Documentation sections">
      {#each groups as group (group.title)}<div class="docs-nav-group"><p>{group.title}</p>
        {#each group.links as link (link.href)}<a href={resolve(link.href)} aria-current={page.url.pathname === link.href ? 'page' : undefined} onclick={() => menuOpen = false}>{link.title}{#if 'private' in link}<LockKeyhole size={12} aria-label="Owner access required" />{/if}</a>{/each}
      </div>{/each}
    </nav>
    <p class="docs-sidebar-note">A guide to the work,<br />from first upload to delivery.</p>
  </aside>
  <main id="guide" tabindex="-1" class="docs-content">{@render children()}</main>
</div>
