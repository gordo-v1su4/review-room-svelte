<script lang="ts">
  import { Toggle } from 'bits-ui';
  import { ArrowUpRight, Check, Clock3, Flame, Heart, MessageSquare, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-svelte';
  import type { ReactionEmoji, ReviewComment } from '$lib/review-session';

  let { showHeader = true, comments, draft, time, isVideo, pinTime, onPinTime, onDraft, onPublish, onSeek, onComplete, onReact }: {
    showHeader?: boolean;
    comments: readonly ReviewComment[];
    draft: string;
    time: number;
    isVideo: boolean;
    pinTime: boolean;
    onPinTime: (value: boolean) => void;
    onDraft: (body: string) => void;
    onPublish: () => void;
    onSeek: (time: number) => void;
    onComplete: (commentId: string) => void;
    onReact: (commentId: string, emoji: ReactionEmoji) => void;
  } = $props();

  const reactions = [
    { emoji: 'thumbs_up', label: 'Thumbs up', icon: ThumbsUp },
    { emoji: 'thumbs_down', label: 'Thumbs down', icon: ThumbsDown },
    { emoji: 'fire', label: 'Fire', icon: Flame },
    { emoji: 'heart', label: 'Heart', icon: Heart }
  ] as const;
</script>

<section class="comments" aria-label="Review notes">
  {#if showHeader}<div class="comments-title"><h3><MessageSquare size={16}/> Notes <span>{comments.length}</span></h3></div>{/if}
  {#if !comments.length}
    <p class="no-comments">No notes yet.</p>
  {:else}
    <div class="comment-list">
      {#each comments as note (note.id)}
        <article class="comment" aria-label={note.completedAt ? 'Handled note' : 'Open note'}>
          <span class="avatar small" aria-hidden="true">{(note.authorName ?? "You").slice(0, 2).toUpperCase()}</span>
          <div class="note-content">
            <div class="note-heading"><strong>{note.authorName ?? "You"}</strong>{#if note.authorRole}<span class="author-role">{note.authorRole === "admin" ? "Team" : "Client"}</span>{/if}
              {#if note.timecodeSec !== null && isVideo}
                <button type="button" class="note-time seek-note" aria-label={`Seek to ${note.timecodeSec.toFixed(2)} seconds`} onclick={() => onSeek(note.timecodeSec!)}><Clock3 size={12}/>{note.timecodeSec.toFixed(2)}s</button>
              {/if}
              {#if note.completedAt}<span class="handled-label"><Check size={12}/> Handled</span>{/if}
            </div>
            <p>{note.body}</p>
            <div class="note-actions">
              <div class="reaction-row" role="group" aria-label="Note reactions">
                {#each reactions as reaction (reaction.emoji)}
                  {@const count = note.reactions?.[reaction.emoji]?.length ?? 0}
                  <Toggle.Root
                    class="note-action reaction"
                    pressed={note.reactions?.[reaction.emoji]?.includes('local-reviewer') ?? false}
                    onPressedChange={() => onReact(note.id, reaction.emoji)}
                    aria-label={`${reaction.label}${count ? `, ${count} reactions` : ''}`}
                    title={reaction.label}
                  ><reaction.icon size={13}/>{#if count}<span>{count}</span>{/if}</Toggle.Root>
                {/each}
              </div>
              <button type="button" class="note-action completion" onclick={() => onComplete(note.id)}>
                {#if note.completedAt}<RotateCcw size={12}/> Reopen{:else}<Check size={13}/> Mark handled{/if}
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
  <form onsubmit={event => { event.preventDefault(); if (draft.trim()) onPublish(); }}>
    <textarea aria-label="Comment draft" placeholder="Add a note…" value={draft} oninput={event => onDraft(event.currentTarget.value)} rows="3"></textarea>
    <div class="composer-footer">
      {#if isVideo}<label class="time-toggle"><input type="checkbox" checked={pinTime} onchange={event => onPinTime(event.currentTarget.checked)}/><Clock3 size={13}/>{time.toFixed(2)}s</label>{:else}<span></span>{/if}
      <button type="submit" class="send-button" aria-label="Add note" disabled={!draft.trim()}><ArrowUpRight size={18}/></button>
    </div>
  </form>
</section>

<style>
  .author-role { font-size: 10px; color: var(--muted); }
  .note-content { min-width: 0; flex: 1; }
  .note-heading, .handled-label, .seek-note, .note-actions, .reaction-row { display: flex; align-items: center; }
  .note-heading { gap: 8px; flex-wrap: wrap; }
  .seek-note { gap: 4px; min-height: 28px; margin-left: 0; }
  .handled-label { gap: 3px; font-size: 10px; color: var(--teal); }
  .note-actions { gap: 8px; justify-content: space-between; flex-wrap: wrap; margin-top: 8px; }
  .reaction-row { gap: 4px; }
  :global(.note-action) { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 28px; min-height: 28px; padding: 3px 6px; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: var(--muted); font-size: 10px; }
  :global(.note-action:hover) { background: var(--raised); color: var(--ink); }
  :global(.note-action[aria-pressed='true']) { color: var(--teal); border-color: var(--accent); background: var(--raised); }
  .completion { white-space: nowrap; }
  @media (pointer: coarse), (max-width: 760px) {
    :global(.note-action), .seek-note { min-width: 44px; min-height: 44px; }
    .send-button { min-width: 44px; min-height: 44px; }
  }
</style>
