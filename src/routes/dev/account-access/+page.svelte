<script lang="ts">
  import AccountPanel from '$lib/components/AccountPanel.svelte';
  import type { AccountGateway, AccountOutcome, AccountUser, AuthProviders } from '$lib/account-access';
  let revision = $state(0), failNext = $state(false), denyProfile = $state(false);
  let google = $state(true), github = $state(false), recovery = $state(true);
  let lastRequest = $state('None'), requests = $state(0);
  let user: AccountUser | undefined, pendingOAuth = false;
  const providers = (): AuthProviders => ({ password: true, signup: true, passwordReset: recovery, google, github });
  function result(kind: 'signed-out' | 'denied' | 'redirecting'): AccountOutcome { return { kind, providers: providers() }; }
  function complete(name = 'Fixture reviewer', email = 'reviewer@example.test'): AccountOutcome {
    if (denyProfile) return result('denied');
    user = { id: 'fixture-only', name, email, role: 'client' };
    return { kind: 'authenticated', user, providers: providers() };
  }
  async function request(type: string, signal: AbortSignal) {
    lastRequest = type; requests++;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 120);
      function abort() { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }
      if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
    });
    if (failNext) { failNext = false; throw new Error('Fixture service failure: internal details must not be shown.'); }
  }
  const gateway: AccountGateway = {
    async load(signal) {
      await request('load', signal);
      if (pendingOAuth) { pendingOAuth = false; return complete(); }
      return user ? { kind: 'authenticated', user, providers: providers() } : result('signed-out');
    },
    async submit(input, signal) {
      await request(input.type === 'password' ? input.flow : input.type, signal);
      if (input.type === 'reset') return { kind: 'reset-code', email: input.email.trim().toLowerCase(), providers: providers() };
      if (input.type === 'reset-verification') {
        if (input.code !== '12345678') throw new Error('Invalid fixture code');
        return complete(undefined, input.email);
      }
      if (input.type === 'oauth') { pendingOAuth = true; return result('redirecting'); }
      return complete(input.flow === 'signUp' ? input.name : undefined, input.email);
    },
    async signOut(signal) { await request('signOut', signal); user = undefined; pendingOAuth = false; return result('signed-out'); },
  };
  function reset() { user = undefined; pendingOAuth = false; revision++; }
</script>

<svelte:head><title>Account access fixture</title><meta name="robots" content="noindex"/></svelte:head>
<main>
  <h1>Account access fixture</h1>
  <p>Test identities only. No account, password or email is changed or sent. Reset code: 12345678.</p>
  <fieldset><legend>Fixture controls</legend>
    <label><input type="checkbox" bind:checked={failNext}/> Fail next request</label>
    <label><input type="checkbox" bind:checked={denyProfile}/> Deny app profile</label>
    <label><input type="checkbox" bind:checked={google}/> Google enabled</label>
    <label><input type="checkbox" bind:checked={github}/> GitHub enabled</label>
    <label><input type="checkbox" bind:checked={recovery}/> Recovery enabled</label>
    <button onclick={reset}>Reset fixture / reload providers</button>
  </fieldset>
  <p aria-live="polite">Requests: {requests} · Last request: {lastRequest}</p>
  <section aria-label="Account panel">{#key revision}<AccountPanel {gateway}/>{/key}</section>
</main>

<style>
  main { width: min(400px, calc(100% - 32px)); margin: 24px auto; }
  h1 { font-size: 20px; } p,fieldset { font-size: 12px; line-height: 1.5; color: var(--muted); }
  fieldset { border: 1px solid var(--border); border-radius: 6px; padding: 12px; }
  label { display: flex; gap: 8px; align-items: center; min-height: 30px; }
  button { min-height: 32px; padding: 6px 10px; color: var(--ink); background: var(--raised); border-radius: 5px; }
  section { background: var(--panel); padding: 16px; border-radius: 8px; }
  @media (pointer: coarse) { label,button { min-height: 44px; } }
</style>
