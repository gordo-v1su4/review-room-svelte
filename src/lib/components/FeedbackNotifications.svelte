<script lang="ts">
  import { Popover } from 'bits-ui';
  import { Bell, ArrowUpRight } from 'lucide-svelte';
  import FeedbackInbox from './FeedbackInbox.svelte';
  import type { FeedbackDigest, FeedbackNote } from '$lib/feedback-inbox';

  let { groups, onOpenNote, onToggleComplete, onNavigateFocus }: {
    groups: readonly FeedbackDigest[];
    onOpenNote: (note: FeedbackNote) => void;
    onToggleComplete: (note: FeedbackNote) => void;
    onNavigateFocus?: () => boolean;
  } = $props();
  let open = $state(false);
  let inboxOpen = $state(false);
  let trigger = $state<HTMLButtonElement | null>(null);
  const openCount = $derived(groups.reduce((count, group) => count + group.needsAttentionCount, 0));
  function openInbox() { open = false; inboxOpen = true; }
</script>

<Popover.Root bind:open>
  <Popover.Trigger bind:ref={trigger} class="icon-button notifications-trigger" aria-label={`Notifications, ${openCount} open notes`} title="Notifications">
    <Bell size={16}/>{#if openCount}<span class="notification-count" aria-hidden="true">{openCount > 9 ? '9+' : openCount}</span>{/if}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="notifications-popover" align="end" sideOffset={8} collisionPadding={12} aria-label="Notifications" onCloseAutoFocus={event => { if (inboxOpen) event.preventDefault(); }}>
      <div class="notification-heading"><h2>Notifications</h2><button onclick={openInbox}>View inbox<ArrowUpRight size={12}/></button></div>
      <div class="notification-list">
        {#if !groups.length}<p class="notification-empty">No feedback yet.</p>{/if}
        {#each groups.slice(0, 8) as group (group.id)}
          <button class="notification-digest" onclick={openInbox}>
            <span class="digest-copy"><strong>{group.projectName}</strong><span>{group.comments.length} {group.comments.length === 1 ? 'comment' : 'comments'}</span></span>
            {#if group.needsAttentionCount}<span class="digest-open">{group.needsAttentionCount} open</span>{/if}
          </button>
        {/each}
      </div>
      <button class="notification-footer" onclick={openInbox}>Open feedback inbox<ArrowUpRight size={13}/></button>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
<FeedbackInbox {groups} {onNavigateFocus} {onOpenNote} {onToggleComplete} bind:open={inboxOpen} showTrigger={false} onRestoreFocus={() => trigger?.focus()}/>

<style>
  :global(.notifications-trigger) { position: relative; flex-shrink: 0; width: 30px; height: 30px; }
  .notification-count { position: absolute; right: -3px; top: -3px; min-width: 13px; padding: 1px 3px; border-radius: 3px; background: var(--teal); color: var(--canvas); font-size: 8px; line-height: 12px; font-weight: 650; }
  :global(.notifications-popover) { z-index: 85; width: min(320px, calc(100vw - 24px)); padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel); box-shadow: 0 12px 40px #0008; }
  .notification-heading { display: flex; align-items: center; justify-content: space-between; padding: 2px 4px 10px; border-bottom: 1px solid var(--border); }
  h2 { margin: 0; font-size: 12px; font-weight: 550; }
  button { color: var(--ink); background: transparent; }
  .notification-heading button, .notification-footer { display: flex; align-items: center; justify-content: center; gap: 5px; min-height: 28px; font-size: 10px; color: var(--muted); }
  .notification-list { max-height: min(300px, 55svh); overflow-y: auto; overscroll-behavior: contain; }
  .notification-empty { margin: 20px 4px; text-align: center; color: var(--muted); font-size: 12px; }
  .notification-digest { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 10px 6px; border-radius: 4px; text-align: left; }
  .notification-digest:hover { background: var(--raised); }
  .digest-copy { display: grid; min-width: 0; gap: 3px; }
  .digest-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 500; }
  .digest-copy > span { color: var(--muted); font-size: 10px; }
  .digest-open { flex-shrink: 0; padding: 3px 5px; border-radius: 3px; color: var(--teal); background: #6ad2b510; font-size: 10px; }
  .notification-footer { width: 100%; margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--border); }
  button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
  @media (pointer: coarse) { .notification-heading button, .notification-footer, .notification-digest, :global(.notifications-trigger) { min-width: 44px; min-height: 44px; } }
</style>
