<script lang="ts" generics="T">
  import { tick, untrack, type Snippet } from 'svelte';
  import { ArrowRight, LockKeyhole, RotateCcw } from 'lucide-svelte';
  import { createPublicReviewAccess, type PublicReviewGateway, type PublicReviewState } from '$lib/public-review-access';

  let { token, gateway, children }: {
    token: string;
    gateway: PublicReviewGateway<T>;
    children: Snippet<[Extract<PublicReviewState<T>, { kind: 'ready' }>]>
  } = $props();
  let accessState = $state<PublicReviewState<T>>({ kind: 'loading', busy: true });
  let passcode = $state('');
  let name = $state('');
  let controller: ReturnType<typeof createPublicReviewAccess<T>> | undefined;
  let heading = $state<HTMLHeadingElement>();
  let nameInput = $state<HTMLInputElement>();
  let passcodeInput = $state<HTMLInputElement>();
  let readyContent = $state<HTMLDivElement>();
  const unavailable = {
    expired: { title: 'This review link has expired', message: 'Ask the person who shared it for a new link.' },
    missing: { title: 'This review link is unavailable', message: 'The link may have been removed. Check the address or ask for a new link.' },
    unavailable: { title: 'Review is temporarily unavailable', message: 'This review can’t be opened right now. Try again in a moment.' }
  } as const;

  $effect(() => {
    const access = createPublicReviewAccess(gateway, next => { accessState = next; });
    controller = access;
    passcode = ''; name = '';
    void access.load(token);
    return () => { access.dispose(); if (controller === access) controller = undefined; };
  });

  async function focusGate(access: NonNullable<typeof controller>) {
    await tick();
    if (access !== controller) return;
    const next = untrack(() => accessState);
    if (next.kind === 'passcode') passcodeInput?.focus();
    else if (next.kind === 'name') nameInput?.focus();
    else if (next.kind === 'ready') readyContent?.focus();
    else if (next.kind === 'unavailable') heading?.focus();
  }
  async function retry() {
    const access = controller;
    if (!access || accessState.busy) return;
    await access.load(token);
    await focusGate(access);
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const access = controller;
    if (!access || accessState.busy) return;
    if (accessState.kind === 'passcode' && passcode.trim()) {
      await access.submitPasscode(passcode);
      if (access !== controller) return;
      passcode = '';
      await focusGate(access);
    } else if (accessState.kind === 'name' && name.trim()) {
      await access.submitName(name.trim());
      await focusGate(access);
    }
  }

</script>

{#if accessState.kind === 'ready'}
  <div bind:this={readyContent} class="review-ready" tabindex="-1" aria-label="Shared review">{@render children(accessState)}</div>
{:else}
  <div class="review-access-page">
    <header class="access-brand">review room.</header>
    <main class="access-main" aria-busy={accessState.busy}>
      <section class="access-content" aria-label="Review access">
        {#if accessState.kind === 'loading'}
          <div class="loading-track" aria-hidden="true"></div>
          <h1 bind:this={heading} tabindex="-1">Opening your review</h1>
          <p role="status">Checking access…</p>
        {:else if accessState.kind === 'unavailable'}
          <h1 bind:this={heading} tabindex="-1">{unavailable[accessState.reason].title}</h1>
          <p>{unavailable[accessState.reason].message}</p>
          {#if accessState.reason === 'unavailable'}<button type="button" class="access-button" onclick={retry}><RotateCcw size={14}/>Try again</button>{/if}
        {:else}
          {#if accessState.kind === 'passcode'}<LockKeyhole size={20} class="access-lock" aria-hidden="true"/>{/if}
          <h1 bind:this={heading} tabindex="-1">{accessState.projectTitle || 'Private review'}</h1>
          <p>{accessState.kind === 'passcode' ? 'Enter the passcode to open this review.' : 'Your name will appear with your feedback.'}</p>
          <form onsubmit={submit}>
            {#if accessState.kind === 'passcode'}
              <label for="review-passcode">Passcode</label>
              <input bind:this={passcodeInput} id="review-passcode" name="passcode" type="password" autocomplete="current-password" bind:value={passcode} disabled={accessState.busy} maxlength="256" required aria-invalid={Boolean(accessState.error)} aria-describedby={accessState.error ? 'review-access-error' : undefined}/>
            {:else}
              <label for="review-name">Your name</label>
              <input bind:this={nameInput} id="review-name" name="name" autocomplete="name" bind:value={name} disabled={accessState.busy} maxlength="80" required aria-invalid={Boolean(accessState.error)} aria-describedby={accessState.error ? 'review-access-error' : undefined}/>
            {/if}
            {#if accessState.error}<p class="access-error" id="review-access-error" role="alert">{accessState.error}</p>{/if}
            <button type="submit" class="access-button primary" disabled={accessState.busy || !(accessState.kind === 'passcode' ? passcode.trim() : name.trim())}>
              {accessState.busy ? 'Checking…' : accessState.kind === 'passcode' ? 'Continue' : 'Start review'}<ArrowRight size={14}/>
            </button>
          </form>
        {/if}
      </section>
    </main>
  </div>
{/if}

<style>
  .review-ready:focus { outline: none; }
  .review-access-page { min-height: 100svh; background: radial-gradient(ellipse at 50% 0%, #12201d66, transparent 55%), var(--canvas); color: var(--ink); }
  .access-brand { height: 64px; display: flex; align-items: center; padding: 0 clamp(20px, 4vw, 56px); font-size: 18px; font-weight: 600; letter-spacing: -.8px; color: var(--muted); }
  .access-main { min-height: calc(100svh - 64px); display: grid; align-items: center; padding: 24px 24px max(88px, env(safe-area-inset-bottom)); }
  .access-content { width: min(100%, 360px); margin-inline: auto; }
  h1 { margin: 0; font-size: clamp(22px, 4vw, 28px); font-weight: 550; line-height: 1.2; letter-spacing: -.8px; overflow-wrap: anywhere; outline: none; }
  p { margin: 12px 0 24px; color: var(--muted); font-size: 13px; line-height: 1.6; }
  :global(.access-lock) { margin-bottom: 20px; color: var(--teal); }
  form { display: grid; gap: 10px; }
  label { font-size: 11px; color: var(--muted); }
  input { box-sizing: border-box; width: 100%; height: 36px; padding: 0 10px; border: 1px solid var(--border); border-radius: 5px; background: var(--panel); color: var(--ink); font: inherit; font-size: 14px; }
  input[aria-invalid='true'] { border-color: #ca887b; }
  .access-button { display: inline-flex; align-items: center; justify-content: center; justify-self: start; gap: 8px; min-height: 30px; padding: 0 12px; border: 1px solid var(--border); border-radius: 5px; background: var(--raised); color: var(--ink); font: inherit; font-size: 12px; cursor: pointer; transition: background 120ms ease; }
  .access-button.primary { margin-top: 8px; background: linear-gradient(150deg, #285b54, #234b45); border-color: #47766d70; }
  .access-button:hover:not(:disabled) { background: #315e56; }
  .access-button:disabled { cursor: default; opacity: .5; }
  .access-button:focus-visible, input:focus-visible { outline: 2px solid var(--teal); outline-offset: 3px; }
  .access-error { margin: 0; color: #e6a79b; font-size: 12px; }
  .loading-track { height: 2px; width: 48px; margin-bottom: 24px; background: var(--teal); opacity: .65; }
  @media(max-width: 760px), (pointer: coarse) { input { height: 44px; font-size: 16px; } .access-button { min-height: 44px; } }
  @media(prefers-reduced-motion: reduce) { .access-button { transition: none; } }
</style>
