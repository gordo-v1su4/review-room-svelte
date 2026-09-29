<script lang="ts">
  let { data, form } = $props();
  let setup = $state(false);
  let showSetup = $derived(setup || Boolean(form?.setupInvalid));
</script>

<svelte:head><title>Sign in · Review Room</title><meta name="robots" content="noindex" /></svelte:head>
<main class="sign-in">
  <a class="wordmark" href="/">review room.</a>
  <div class="intro"><p class="eyebrow">V1su4 workspace</p><h1>Sign in</h1><p>Continue to your projects and private reviews.</p></div>

  {#if !showSetup}
    <form method="POST" action="?/email" class="fields">
      <label for="email">Email</label><input id="email" type="email" name="email" autocomplete="username" required />
      <label for="password">Password</label><input id="password" type="password" name="password" autocomplete="current-password" required />
      {#if form?.invalid}<p class="error" role="alert">Email or password was not accepted.</p>{/if}
      {#if form?.unauthorized}<p class="error" role="alert">This account does not have owner access.</p>{/if}
      <button class="primary" type="submit">Sign in</button>
    </form>
  {:else}
    <form method="POST" action="?/create" class="fields">
      <p class="hint">Create your owner account with the current owner password.</p>
      <label for="setup-email">Owner email</label><input id="setup-email" type="email" name="email" autocomplete="username" required />
      <label for="setup-password">New password</label><input id="setup-password" type="password" name="password" autocomplete="new-password" minlength="8" required />
      <label for="owner-password">Current owner password</label><input id="owner-password" type="password" name="ownerPassword" autocomplete="current-password" required />
      {#if form?.setupInvalid}<p class="error" role="alert">Account setup was not completed. Check the owner email and passwords.</p>{/if}
      <button class="primary" type="submit">Create owner account</button>
    </form>
  {/if}

  {#if !data.ownerReady || showSetup}<button class="mode" type="button" onclick={() => showSetup ? location.assign('/studio/sign-in') : setup = true}>{showSetup ? 'Back to sign in' : 'Set up owner account'}</button>{/if}
  <details class="legacy"><summary>Use current owner password</summary><form method="POST" action="?/legacy" class="fields"><label for="legacy-password">Owner password</label><input id="legacy-password" type="password" name="password" autocomplete="current-password" required />{#if form?.legacyInvalid}<p class="error" role="alert">Password not accepted.</p>{/if}<button type="submit">Continue</button></form></details>
</main>

<style>
  .sign-in{width:min(360px,calc(100% - 40px));margin:0 auto;padding:clamp(32px,9svh,88px) 0 40px}
  .wordmark{color:var(--ink);font-size:19px;font-weight:650;letter-spacing:-.06em;text-decoration:none}
  .intro{margin:42px 0 23px}.eyebrow{color:var(--teal);font-size:10px;font-weight:650;letter-spacing:.14em;text-transform:uppercase;margin:0 0 8px}
  h1{font-size:25px;font-weight:600;letter-spacing:-.045em;line-height:1.1;margin:0 0 8px}.intro p:last-child,.hint{color:var(--muted);font-size:12px;line-height:1.5;margin:0}
  .fields{display:grid;gap:7px}.fields label{color:var(--ink);font-size:11px;font-weight:600;margin-top:7px}.fields input{width:100%;height:36px;padding:0 11px;background:var(--raised);color:var(--ink);border:1px solid var(--control-border);border-radius:7px}
  .fields input:hover{border-color:var(--control-border-hover)}.fields button{height:36px;border:1px solid var(--control-border);border-radius:7px;font-size:12px;font-weight:650;margin-top:10px;background:var(--raised)}
  .fields button.primary{background:var(--accent);border-color:color-mix(in srgb,var(--teal) 20%,transparent)}.fields button:hover{filter:brightness(1.12)}
  .mode{display:block;background:none;border:0;color:var(--teal);font-size:12px;padding:12px 0;margin-top:8px}.legacy{border-top:1px solid var(--border);padding-top:15px;margin-top:16px;color:var(--muted);font-size:11px}.legacy summary{cursor:pointer}.legacy .fields{margin-top:12px}.error{color:var(--status-needs-changes);font-size:11px;margin:4px 0}.hint{margin:2px 0 8px}
  @media(pointer:coarse){.fields input,.fields button{min-height:44px}.mode,.legacy summary{min-height:44px;display:flex;align-items:center}}
</style>
