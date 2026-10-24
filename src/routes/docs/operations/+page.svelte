<script lang="ts">import type { PageData } from './$types'; let { data }: { data: PageData } = $props();</script>
<svelte:head><title>Owner operations · Review Room</title><meta name="robots" content="noindex,nofollow" /></svelte:head>
<header class="docs-heading"><p class="docs-kicker">Owner access</p><h1>Run the room.<br />Protect the source.</h1><p class="docs-lead">Setup, system responsibilities, release checks and recovery for this dedicated Review Room deployment.</p></header>
<aside class="docs-note"><strong>Canonical configuration and recovery reference</strong><p><a href="/docs/operations/runbook.md">Read the maintained deployment runbook</a> for configuration names, dedicated service inventory and detailed recovery context. This page and the runbook require the existing owner session, including direct requests.</p></aside>
{#each data.sections as section (section.title)}<section><h2>{section.title}</h2>{#each section.paragraphs as paragraph (paragraph)}<p>{paragraph}</p>{/each}</section>{/each}
<footer class="docs-footer"><a href="/docs/agents">Agents & API</a><a href="/docs/operations/runbook.md">Deployment runbook · Markdown</a></footer>
