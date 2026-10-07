<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { Popover } from 'bits-ui';
  import { Activity, ArrowUpRight, Check, CircleAlert, LoaderCircle, Upload, X } from 'lucide-svelte';
  import type { ActivityFeed, ActivityItem } from '$lib/work-activity';
  import { observeActivity } from '$lib/activity-observer';

  let { feed, onOpen }: { feed: ActivityFeed; onOpen: (item: ActivityItem) => void } = $props();
  let activity = $state(untrack(() => feed.snapshot()));
  let open = $state(false);
  let automatic = false;
  let pulse = 0;
  const working = $derived(activity.counts.active + activity.counts.queued);
  const current = $derived(activity.items.find(item => item.state === 'running') ?? activity.items.find(item => item.state === 'queued'));
  const summary = $derived(current ? `${current.stage} · ${working}${activity.truncated ? '+' : ''}` : activity.counts.failed ? `${activity.counts.failed} need attention` : activity.counts.complete ? 'Finished' : 'Activity');

  onMount(() => {
    const unsubscribe = feed.subscribe(value => {
      activity = value;
      if (value.pulse > pulse) { pulse = value.pulse; automatic = true; open = true; }
      if (automatic && !value.items.length && !value.stale) open = false;
    });
    const observer = observeActivity(feed);
    const timer = setInterval(feed.tick, 1000);
    return () => { unsubscribe(); observer.stop(); clearInterval(timer); };
  });
  function inspect(item: ActivityItem) { open = false; automatic = false; onOpen(item); }
</script>

<Popover.Root bind:open>
  <Popover.Trigger class={`work-activity-trigger ${working > 0 ? 'working' : ''}`} aria-label={`Work activity: ${summary}`} title={summary} onclick={() => automatic = false}>
    <Activity size={15}/><span class="activity-summary">{summary}</span>{#if working}<span class="activity-count">{working}{activity.truncated ? '+' : ''}</span>{:else if activity.counts.failed}<span class="attention-dot" aria-hidden="true"></span>{/if}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="work-activity-panel" align="end" side="bottom" sideOffset={9} collisionPadding={12} aria-label="Work activity" onOpenAutoFocus={event => { if (automatic) event.preventDefault(); }} onCloseAutoFocus={event => { if (automatic) event.preventDefault(); }}>
      <div class="activity-heading"><h2>Work activity</h2><Popover.Close class="activity-close" aria-label="Close work activity"><X size={15}/></Popover.Close></div>
      <div class="activity-totals"><span>{activity.counts.active} active</span><span>{activity.counts.queued} queued</span>{#if activity.counts.failed}<span class="attention">{activity.counts.failed} need attention</span>{/if}</div>
      {#if activity.stale}<p class="activity-notice" role="status">Connection interrupted. Keeping the last known state while reconnecting.</p>{/if}
      {#if activity.truncated}<p class="activity-notice">Showing a limited activity window. More work may be in progress.</p>{/if}
      <div class="activity-rows" aria-live="polite" aria-relevant="additions text">
        {#each activity.items as item (item.id)}
          <div class="activity-row" class:failed={item.state === 'failed'}>
            <span class="activity-icon" aria-hidden="true">{#if item.state === 'running'}<LoaderCircle size={15} class="activity-spin"/>{:else if item.state === 'complete'}<Check size={15}/>{:else if item.state === 'failed'}<CircleAlert size={15}/>{:else if item.kind === 'upload'}<Upload size={15}/>{:else}<Activity size={15}/>{/if}</span>
            <div class="activity-copy"><strong title={item.label}>{item.label}</strong><span class="activity-project" title={item.project}>{item.project}</span><span class="activity-stage">{item.stage}{#if item.progress !== undefined} · {Math.floor(item.progress)}%{/if}</span>{#if item.progress !== undefined}<progress max="100" value={item.progress} aria-label={`Upload progress for ${item.label}`}></progress>{/if}</div>
            <div class="activity-actions">{#if item.projectId}<button onclick={() => inspect(item)} aria-label={`Open ${item.label} in ${item.project}`} title={item.state === 'failed' ? 'Open project to resolve' : 'Open project'}><ArrowUpRight size={14}/></button>{/if}{#if item.state !== 'queued' && item.state !== 'running'}<button onclick={() => feed.dismiss(item.id)} aria-label={`Dismiss ${item.label}`} title="Dismiss"><X size={13}/></button>{/if}</div>
          </div>
        {:else}<p class="activity-empty">All quiet. Uploads, processing and transfers appear here.</p>{/each}
      </div>
      <p class="activity-footer">Finished work clears after a few seconds.</p>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  :global(.work-activity-trigger) { display: flex; align-items: center; gap: 7px; height: 30px; max-width: 245px; padding: 0 8px; border: 1px solid transparent; border-radius: 5px; background: transparent; color: var(--muted); cursor: pointer; }
  :global(.work-activity-trigger:hover) { background: var(--raised); color: var(--ink); }
  :global(.work-activity-trigger.working) { color: var(--teal); background: color-mix(in srgb, var(--teal) 9%, transparent); border-color: color-mix(in srgb, var(--teal) 24%, transparent); box-shadow: inset 0 1px #6ad2b512; }
  :global(.work-activity-trigger.working:hover) { background: color-mix(in srgb, var(--teal) 14%, transparent); }
  .activity-summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
  .activity-count { display: none; font-size: 10px; }
  .attention-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--warning, #e2b882); }
  :global(.work-activity-panel) { z-index: 95; width: min(370px, calc(100vw - 24px)); padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: color-mix(in srgb, var(--raised) 68%, transparent); backdrop-filter: blur(18px); box-shadow: inset 0 1px #d3eee609, 0 16px 50px #0006; animation: activity-enter .18s ease-out; }
  .activity-heading { display: flex; align-items: center; justify-content: space-between; }
  h2 { margin: 0; color: var(--ink); font-size: 12px; font-weight: 550; }
  :global(.activity-close), .activity-actions button { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 0; border-radius: 5px; background: transparent; color: var(--muted); cursor: pointer; }
  :global(.activity-close:hover), .activity-actions button:hover { background: var(--raised); color: var(--ink); }
  .activity-totals { display: flex; flex-wrap: wrap; gap: 10px; padding: 6px 0 12px; color: var(--muted); font-size: 10px; border-bottom: 1px solid var(--border); }
  .activity-rows { max-height: min(420px, 60svh); overflow-y: auto; overscroll-behavior: contain; }
  .activity-row { display: flex; align-items: flex-start; gap: 10px; padding: 13px 0; border-bottom: 1px solid var(--border); }
  .activity-row:last-child { border-bottom: 0; }
  .activity-icon { padding-top: 2px; color: var(--teal); }
  .failed .activity-icon, .attention { color: var(--warning, #e2b882); }
  .activity-copy { display: grid; gap: 4px; flex: 1; min-width: 0; }
  .activity-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 500; color: var(--ink); }
  .activity-project { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; color: var(--muted); }
  .activity-stage { font-size: 10px; color: var(--ink); opacity: .8; }
  .activity-actions { display: flex; }
  progress { width: 100%; height: 2px; margin-top: 3px; accent-color: var(--teal); border: 0; }
  progress::-webkit-progress-bar { background: var(--border); }
  progress::-webkit-progress-value { background: var(--teal); }
  .activity-empty { padding: 18px 6px; margin: 0; font-size: 11px; text-align: center; color: var(--muted); line-height: 1.6; }
  .activity-notice { font-size: 10px; color: var(--muted); line-height: 1.6; }
  .activity-footer { margin: 0; padding-top: 8px; color: var(--muted); font-size: 9px; border-top: 1px solid var(--border); }
  :global(.activity-spin) { animation: activity-spin 1.4s linear infinite; }
  :global(.work-activity-trigger:focus-visible), :global(.activity-close:focus-visible), button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
  @keyframes activity-enter { from { opacity: 0; transform: translateY(-7px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes activity-spin { to { transform: rotate(360deg); } }
  @media (max-width: 760px) { .activity-summary { display: none; } .activity-count { display: inline; } :global(.work-activity-trigger) { padding: 0 5px; } }
  @media (pointer: coarse) { :global(.work-activity-trigger), :global(.activity-close), .activity-actions button { min-height: 44px; min-width: 44px; } }
  @media (prefers-reduced-motion: reduce) { :global(.work-activity-panel), :global(.activity-spin) { animation: none; } }
</style>
