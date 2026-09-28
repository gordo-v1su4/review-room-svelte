<script lang="ts">let { form } = $props();</script>
<svelte:head><title>Owner sign in · Review Room</title></svelte:head>
<main class="shell narrow">
  <p class="eyebrow">Personal workspace</p>
  <h1>Review Room</h1>
  <p class="muted">Sign in to manage your projects and private reviews.</p>
  <form method="POST" class="panel stack">
    <label>Owner password <input type="password" name="password" autocomplete="current-password" required /></label>
    {#if form?.invalid}<p role="alert">Password not accepted.</p>{/if}
    <button class="primary">Sign in</button>
  </form>
</main>
<style>
  .shell{max-width:1080px;margin:0 auto;padding:clamp(24px,5vw,64px)}.narrow{max-width:520px}.eyebrow{color:var(--teal);font-size:12px;text-transform:uppercase;letter-spacing:.13em;margin-bottom:12px}.muted{color:var(--muted);margin:10px 0 24px}.panel{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:24px}.stack{display:grid;gap:16px}label{display:grid;gap:7px}input{width:100%;padding:12px;background:var(--raised);color:var(--ink);border:1px solid var(--control-border);border-radius:9px}.primary{background:var(--accent);padding:12px 18px;border-radius:9px;font-weight:700}
</style>
