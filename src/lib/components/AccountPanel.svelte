<script lang="ts">
  import { onMount, onDestroy, tick, untrack } from 'svelte';
  import { Eye, EyeOff, Github } from 'lucide-svelte';
  import { createAccountAccess, offlineAccountGateway, type AccountGateway, type AccountState, type AccountRequest } from '$lib/account-access';

  let { gateway = offlineAccountGateway }: { gateway?: AccountGateway } = $props();
  let account = $state.raw<AccountState>({ kind: 'loading', providers: { password: false, signup: false, passwordReset: false, google: false, github: false }, busy: false });
  let flow = $state<'signIn' | 'signUp' | 'reset'>('signIn'), email = $state(''), showPassword = $state(false);
  let notice = $state('');
  let localError = $state(''), showError = $state(true);
  let feedback = $state<HTMLParagraphElement>(), heading = $state<HTMLHeadingElement>();
  const manager = createAccountAccess(untrack(() => gateway), next => { account = next; });
  const error = $derived(localError || (showError ? account.error : undefined));
  const mode = $derived(account.kind === 'reset-code' ? 'resetVerification' : flow);
  onMount(() => { void manager.load(); });
  onDestroy(() => manager.dispose());
  async function focusResult() { await tick(); if (error) feedback?.focus(); else heading?.focus(); }
  async function load() { localError = ''; showError = true; await manager.load(); await focusResult(); }
  function selectFlow(next: typeof flow) { flow = next; showPassword = false; localError = ''; notice = ''; showError = false; }
  async function back() { selectFlow('signIn'); if (account.kind === 'reset-code') await load(); else { await tick(); heading?.focus(); } }
  async function submit(event: SubmitEvent) {
    event.preventDefault(); localError = ''; showError = true;
    const form = event.currentTarget as HTMLFormElement;
    const values = new FormData(form);
    const value = (key: string) => String(values.get(key) ?? '');
    let request: AccountRequest;
    if (mode === 'resetVerification' && account.kind === 'reset-code') {
      if (value('newPassword') !== value('confirmPassword')) { localError = 'The new passwords do not match.'; await focusResult(); return; }
      request = { type: 'reset-verification', email: account.email, code: value('code'), newPassword: value('newPassword') };
    } else if (flow === 'reset') request = { type: 'reset', email: value('email') };
    else if (flow === 'signUp') request = { type: 'password', flow: 'signUp', name: value('name'), email: value('email'), password: value('password') };
    else request = { type: 'password', flow: 'signIn', email: value('email'), password: value('password') };
    await manager.submit(request);
    await focusResult();
  }
  async function oauth(provider: 'google' | 'github') { localError = ''; showError = true; await manager.submit({ type: 'oauth', provider }); await focusResult(); }
  async function resend() {
    if (account.kind !== 'reset-code') return;
    localError = ''; showError = true;
    notice = '';
    if (await manager.submit({ type: 'reset', email: account.email })) notice = 'A new reset code has been sent.';
    await focusResult();
  }
  async function signOut() { localError = ''; showError = true; if (await manager.signOut()) selectFlow('signIn'); await focusResult(); }
</script>

<div class="account-panel" aria-busy={account.busy}>
  {#if account.kind === 'loading'}<p role="status">Checking your workspace…</p>
  {:else if account.kind === 'unavailable'}
    <p role="status">Sign-in is unavailable in this local session. Your current media stays in this tab.</p>
    {#if account.error}<button class="btn preset-tonal-surface" onclick={load}>Retry connection</button>{/if}
  {:else if account.kind === 'denied'}
    <h3 bind:this={heading} tabindex="-1">Workspace access unavailable</h3>
    <p role="status">This account is not authorized for the workspace. No project data has been opened.</p>
    <button class="btn preset-tonal-surface" disabled={account.busy} onclick={signOut}>Use another account</button>
  {:else if account.kind === 'redirecting'}
    <h3 bind:this={heading} tabindex="-1">Continue with your provider</h3>
    <p role="status">Complete sign-in with your provider, then check your workspace connection.</p>
    <button class="btn preset-tonal-surface" disabled={account.busy} onclick={load}>Check sign-in</button>
  {:else if account.kind === 'authenticated'}
    <h3 bind:this={heading} tabindex="-1">{account.user.name || account.user.email}</h3>
    <p class="identity">{account.user.email} · {account.user.role === 'admin' ? 'Creator' : 'Reviewer'}</p>
    <button class="btn preset-tonal-surface" disabled={account.busy} onclick={signOut}>{account.busy ? 'Signing out…' : 'Sign out'}</button>
  {:else}
    {#if mode === 'reset' || mode === 'resetVerification'}
      <button class="back" disabled={account.busy} onclick={back}>← Back to sign in</button>
      <h3 bind:this={heading} tabindex="-1">Reset password</h3>
      <p>{account.kind === 'reset-code' ? `Enter the 8-digit code sent to ${account.email}.` : 'Enter the email address for your password account.'}</p>
    {:else}
      <h3 bind:this={heading} tabindex="-1">{flow === 'signUp' ? 'Create account' : 'Sign in'}</h3>
      {#if account.providers.signup}<div class="flow-options" role="group" aria-label="Account action"><button class="btn preset-tonal-surface" aria-pressed={flow === 'signIn'} disabled={account.busy} onclick={() => selectFlow('signIn')}>Sign in</button><button class="btn preset-tonal-surface" aria-pressed={flow === 'signUp'} disabled={account.busy} onclick={() => selectFlow('signUp')}>Create account</button></div>{/if}
    {/if}
    {#if !account.providers.password && !account.providers.google && !account.providers.github}<p role="status">No sign-in methods are available for this workspace.</p>{/if}
    {#if account.providers.password}
      {#key mode}
        <form onsubmit={submit}>
          {#if mode === 'resetVerification'}
            <label>8-digit reset code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern={'[0-9]{8}'} maxlength="8" required disabled={account.busy}/></label>
            <label>New password<div class="password-field"><input name="newPassword" type={showPassword ? 'text' : 'password'} autocomplete="new-password" minlength="8" required disabled={account.busy}/><button type="button" class="reveal" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onclick={() => showPassword = !showPassword}>{#if showPassword}<EyeOff size={15}/>{:else}<Eye size={15}/>{/if}</button></div></label>
            <label>Confirm new password<input name="confirmPassword" type={showPassword ? 'text' : 'password'} autocomplete="new-password" minlength="8" required disabled={account.busy}/></label>
          {:else}
            {#if mode === 'signUp'}<label>Your name<input name="name" autocomplete="name" disabled={account.busy}/></label>{/if}
            <label>Email<input name="email" type="email" autocomplete="email" bind:value={email} required disabled={account.busy}/></label>
            {#if mode !== 'reset'}<label>Password<div class="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autocomplete={flow === 'signIn' ? 'current-password' : 'new-password'} minlength={flow === 'signUp' ? 8 : 1} required disabled={account.busy}/><button type="button" class="reveal" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onclick={() => showPassword = !showPassword}>{#if showPassword}<EyeOff size={15}/>{:else}<Eye size={15}/>{/if}</button></div></label>{/if}
          {/if}
          {#if mode === 'signIn' && account.providers.passwordReset}<button type="button" class="forgot" disabled={account.busy} onclick={() => selectFlow('reset')}>Forgot password?</button>{/if}
          <button type="submit" class="btn preset-tonal-primary" disabled={account.busy}>{account.busy ? 'Please wait…' : mode === 'resetVerification' ? 'Reset password' : mode === 'reset' ? 'Send reset code' : flow === 'signUp' ? 'Create account' : 'Sign in'}</button>
          {#if mode === 'resetVerification'}<button type="button" class="back" disabled={account.busy} onclick={resend}>Send a new code</button>{/if}
        </form>
      {/key}
    {/if}
    {#if (mode === 'signIn' || mode === 'signUp') && (account.providers.google || account.providers.github)}
      <div class="oauth" aria-label="Sign-in providers">
        {#if account.providers.password}<p>Or continue with</p>{/if}
        {#if account.providers.github}<button class="btn preset-tonal-surface" disabled={account.busy} onclick={() => oauth('github')}><Github size={15}/> GitHub</button>{/if}
        {#if account.providers.google}<button class="btn preset-tonal-surface" disabled={account.busy} onclick={() => oauth('google')}>Google</button>{/if}
      </div>
    {/if}
  {/if}
  {#if notice && account.kind === 'reset-code'}<p role="status">{notice}</p>{/if}
  {#if error}<p class="error" role="alert" tabindex="-1" bind:this={feedback}>{error}</p>{/if}
</div>

<style>
  .account-panel { margin-top: 18px; } h3 { font-size: 15px; margin: 14px 0 8px; font-weight: 550; overflow-wrap: anywhere; }
  p { color: var(--muted); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
  .identity { margin-bottom: 18px; } form { display: grid; gap: 12px; margin-top: 16px; }
  label { display: grid; gap: 6px; font-size: 11px; color: var(--muted); }
  input { width: 100%; min-width: 0; min-height: 32px; padding: 6px 9px; border: 1px solid var(--border); border-radius: 5px; color: var(--ink); background: var(--canvas); font-size: 12px; }
  button { display: inline-flex; justify-content: center; align-items: center; gap: 6px; min-height: 28px; padding: 0 10px; border-radius: 5px; color: var(--ink); font-size: 11px; }
  .flow-options { display: flex; gap: 6px; } .flow-options button { flex: 1; } .flow-options button[aria-pressed='true'] { background: color-mix(in srgb, var(--accent) 20%, var(--panel)); }
  .password-field { position: relative; } .password-field input { padding-right: 36px; }
  .reveal { position: absolute; right: 2px; top: 2px; width: 28px; height: calc(100% - 4px); padding: 0; background: transparent; }
  .back,.forgot { color: var(--muted); background: transparent; padding: 0; justify-content: flex-start; } .forgot { justify-self: end; }
  .oauth { display: grid; gap: 8px; margin-top: 18px; } .oauth p { margin: 0; text-align: center; font-size: 11px; }
  .error { color: var(--status-needs-changes); } button:disabled { opacity: .5; cursor: default; }
  button:focus-visible,input:focus-visible,[tabindex='-1']:focus-visible { outline: 1px solid var(--focus-ring); outline-offset: 2px; }
  @media (pointer: coarse) { input,button { min-height: 44px; } input { font-size: 16px; } .reveal { min-height: 40px; min-width: 44px; top: 0; right: 0; height: 100%; } .password-field input { padding-right: 48px; } }
</style>
