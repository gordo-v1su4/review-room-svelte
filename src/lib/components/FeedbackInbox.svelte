<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { ArrowUpRight, Check, Inbox, RotateCcw, Search, X } from 'lucide-svelte';
  import type { FeedbackDigest, FeedbackNote } from '$lib/feedback-inbox';

  let { groups, onOpenNote, onToggleComplete, open = $bindable(false), showTrigger = true, onRestoreFocus }: {
    open?: boolean; showTrigger?: boolean;
    onRestoreFocus?: () => void;
    groups: readonly FeedbackDigest[];
    onOpenNote: (note: FeedbackNote) => void;
    onToggleComplete: (note: FeedbackNote) => void;
  } = $props();

  let search = $state('');
  let scope = $state<'open' | 'all'>('open');
  const openCount = $derived(groups.reduce((count, group) => count + group.needsAttentionCount, 0));
  const totalCount = $derived(groups.reduce((count, group) => count + group.comments.length, 0));
  const visibleGroups = $derived.by(() => {
    const query = search.trim().toLocaleLowerCase();
    return groups.map(group => ({
      ...group,
      comments: group.comments.filter(note =>
        (scope === 'all' || note.completedAt === undefined) &&
        (!query || [group.projectName, note.title, note.authorName, note.body].some(value => value.toLocaleLowerCase().includes(query)))
      )
    })).filter(group => group.comments.length > 0);
  });
  const visibleCount = $derived(visibleGroups.reduce((count, group) => count + group.comments.length, 0));

  function dateLabel(dateKey: string) {
    if (dateKey === 'undated') return 'Undated';
    const date = new Date(`${dateKey}T12:00:00`);
    return Number.isNaN(date.getTime()) ? dateKey : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function timecode(seconds: number) {
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60).toString().padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
  }
  function openNote(note: FeedbackNote) {
    open = false;
    onOpenNote(note);
  }
</script>

<Dialog.Root bind:open>
  {#if showTrigger}<Dialog.Trigger class="nav-item inbox-trigger" aria-label={`Feedback inbox, ${openCount} open notes`}>
    <Inbox size={15}/><span class="inbox-trigger-label">Feedback inbox</span><span class="inbox-count">{openCount}</span>
  </Dialog.Trigger>{/if}
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay"/>
    <Dialog.Content class="filter-sheet inbox-sheet" onCloseAutoFocus={event => { if (onRestoreFocus) { event.preventDefault(); onRestoreFocus(); } }}>
      <div class="inbox-heading">
        <Dialog.Title class="dialog-title">Feedback inbox</Dialog.Title>
        <Dialog.Close class="inbox-close" aria-label="Close feedback inbox"><X size={17}/></Dialog.Close>
      </div>
      <Dialog.Description class="inbox-description">{openCount} open {openCount === 1 ? 'note' : 'notes'} across your projects.</Dialog.Description>
      <div class="inbox-toolbar">
        <div class="inbox-scope" role="group" aria-label="Feedback visibility">
          <button type="button" aria-pressed={scope === 'open'} onclick={() => scope = 'open'}>Open<span>{openCount}</span></button>
          <button type="button" aria-pressed={scope === 'all'} onclick={() => scope = 'all'}>All<span>{totalCount}</span></button>
        </div>
        <label class="inbox-search"><Search size={14}/><input type="search" bind:value={search} placeholder="Search feedback" aria-label="Search feedback"/></label>
      </div>
      <div class="inbox-results" aria-label="Feedback notes">
        {#each visibleGroups as group (group.id)}
          <section class="inbox-group" aria-label={`${group.projectName}, ${dateLabel(group.dateKey)}`}>
            <header class="inbox-group-heading"><h3 title={group.projectName}>{group.projectName}</h3><span>{dateLabel(group.dateKey)}</span></header>
            {#each group.comments as note (note.commentId)}
              <article class={['inbox-note', note.completedAt !== undefined && 'is-handled']}>
                <div class="note-heading"><h4 title={note.title}>{note.title}</h4>{#if note.completedAt !== undefined}<span class="handled-label"><Check size={12}/>Handled</span>{/if}</div>
                <p class="note-body">{note.body}</p>
                <div class="note-footer">
                  <div class="note-author"><span title={note.authorName}>{note.authorName}</span><span class="note-role">{note.authorRole === 'admin' ? 'Production' : 'Reviewer'}</span></div>
                  <div class="note-actions">
                    <button type="button" class="note-open" onclick={() => openNote(note)} aria-label={`Open note on ${note.title}${note.timecodeSec === null ? '' : ` at ${timecode(note.timecodeSec)}`}`}>
                      {#if note.timecodeSec !== null}<span class="note-time">{timecode(note.timecodeSec)}</span>{:else}Open{/if}<ArrowUpRight size={13}/>
                    </button>
                    <button type="button" onclick={() => onToggleComplete(note)} aria-label={`${note.completedAt === undefined ? 'Mark handled' : 'Reopen'} note on ${note.title}`}>
                      {#if note.completedAt === undefined}<Check size={13}/>Handle{:else}<RotateCcw size={13}/>Reopen{/if}
                    </button>
                  </div>
                </div>
              </article>
            {/each}
          </section>
        {:else}
          <div class="inbox-empty"><Inbox size={24}/><p>{totalCount === 0 ? 'No feedback yet.' : search.trim() ? 'No matching notes.' : 'All feedback is handled.'}</p>{#if totalCount > 0}<button type="button" onclick={() => { search = ''; scope = 'all'; }}>Show all feedback</button>{/if}</div>
        {/each}
      </div>
      <p class="inbox-result-count" role="status">{visibleCount} {visibleCount === 1 ? 'note' : 'notes'} shown</p>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.inbox-trigger) { width: 100%; }
  :global(.inbox-trigger-label) { min-width: 0; white-space: nowrap; }
  :global(.inbox-count) { font-variant-numeric: tabular-nums; }
  :global(.inbox-sheet) { display: flex; flex-direction: column; width: min(580px, calc(100vw - 28px)); max-height: min(740px, 90svh); padding: 18px; overflow: hidden; border-color: var(--border); border-radius: 10px; background: linear-gradient(155deg, var(--raised), var(--panel) 35%); box-shadow: inset 0 1px #d3eee609, 0 16px 50px #0006; }
  .inbox-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; }
  :global(.inbox-sheet .dialog-title) { margin: 0; font-size: 15px; font-weight: 550; }
  :global(.inbox-sheet .inbox-description) { margin: 5px 0 14px; font-size: 11px; color: var(--muted); }
  button,:global(.inbox-close) { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 28px; padding: 0 8px; border: 1px solid var(--border); border-radius: 5px; background: var(--panel); color: var(--ink); font: inherit; font-size: 11px; cursor: pointer; }
  button:hover,:global(.inbox-close:hover) { background: var(--raised); }
  :global(.inbox-close) { width: 28px; padding: 0; border: 0; background: transparent; color: var(--muted); }
  .inbox-toolbar { display: flex; align-items: center; gap: 10px; flex-shrink: 0; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
  .inbox-scope { display: inline-flex; gap: 3px; flex-shrink: 0; }
  .inbox-scope button { border-color: transparent; background: transparent; color: var(--muted); }
  .inbox-scope button[aria-pressed='true'] { color: var(--ink); background: var(--raised); border-color: var(--border); }
  .inbox-scope span { font-size: 10px; font-variant-numeric: tabular-nums; color: var(--muted); }
  .inbox-search { display: flex; flex: 1; min-width: 0; align-items: center; gap: 6px; min-height: 28px; padding: 0 8px; border: 1px solid var(--border); border-radius: 5px; background: var(--canvas); color: var(--muted); }
  input { width: 100%; min-width: 0; padding: 5px 0; background: transparent; border: 0; color: var(--ink); font: inherit; font-size: 11px; outline: none; }
  .inbox-search:focus-within { outline: 1px solid var(--accent); outline-offset: 2px; }
  .inbox-results { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .inbox-group { margin-top: 17px; }
  .inbox-group-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; margin-bottom: 8px; }
  .inbox-group-heading h3 { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0; font-size: 12px; font-weight: 550; color: var(--ink); }
  .inbox-group-heading > span { flex-shrink: 0; font-size: 10px; color: var(--muted); }
  .inbox-note { padding: 12px 0; border-top: 1px solid var(--border); }
  .note-heading { display: flex; align-items: center; gap: 10px; }
  h4 { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0; color: var(--ink); font-size: 11px; font-weight: 550; }
  .handled-label { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; margin-left: auto; color: var(--muted); font-size: 10px; }
  .note-body { margin: 7px 0 10px; color: var(--ink); font-size: 12px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
  .is-handled .note-body { color: var(--muted); }
  .note-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 7px 12px; }
  .note-author { display: flex; align-items: baseline; min-width: 0; flex: 1; gap: 7px; color: var(--muted); font-size: 10px; }
  .note-author > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .note-role { flex-shrink: 0; font-size: 9px; }
  .note-actions { display: flex; gap: 5px; }
  .note-open { color: var(--teal); background: transparent; }
  .note-time { font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .inbox-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 160px; gap: 10px; color: var(--muted); }
  .inbox-empty p { margin: 0; font-size: 12px; }
  .inbox-result-count { flex-shrink: 0; margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--border); font-size: 10px; color: var(--muted); }
  button:focus-visible,:global(.inbox-close:focus-visible),:global(.inbox-trigger:focus-visible) { outline: 1px solid var(--accent); outline-offset: 2px; }
  @media(max-width: 760px) { :global(.inbox-sheet) { width: 100%; max-height: 90svh; border-radius: 12px 12px 0 0; padding-bottom: max(18px, env(safe-area-inset-bottom)); } }
  @media(max-width: 420px) { .inbox-toolbar { flex-wrap: wrap; } .inbox-search { flex-basis: 100%; } .note-author { flex-basis: 100%; } }
  @media(pointer: coarse) { button,:global(.inbox-close),:global(.inbox-trigger) { min-width: 44px; min-height: 44px; } .inbox-search { min-height: 44px; } input { font-size: 16px; } }
</style>
