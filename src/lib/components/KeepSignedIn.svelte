<script lang="ts">
  import { KEEP_SIGNED_IN_CHOICES, type KeepSignedIn } from '$lib/session-lifetime';
  let { value = $bindable<KeepSignedIn>('session') }: { value?: KeepSignedIn } = $props();
</script>

<fieldset class="keep">
  <legend>Keep me signed in</legend>
  <div class="segments">
    {#each KEEP_SIGNED_IN_CHOICES as choice (choice.value)}
      <label>
        <input type="radio" name="keep" value={choice.value} bind:group={value} />
        <span>{choice.label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .keep { border:0; margin:7px 0 0; padding:0; min-width:0; }
  legend { padding:0; margin-bottom:7px; color:var(--ink); font-size:11px; font-weight:600; }
  .segments { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:2px; padding:2px; border:1px solid var(--control-border); border-radius:7px; background:#141819; }
  label { position:relative; display:flex; align-items:center; justify-content:center; height:28px; border-radius:5px; color:var(--muted); font-size:11px; font-weight:600; cursor:pointer; user-select:none; transition:background-color .12s,color .12s; }
  label:hover { color:var(--ink); background:color-mix(in srgb,var(--teal) 6%,transparent); }
  label:has(input:checked) { color:var(--teal); background:color-mix(in srgb,var(--teal) 14%,var(--raised)); }
  /* The native radio stays for keyboard, forms without JS and screen readers; only its default look is hidden. */
  input { position:absolute; inset:0; margin:0; opacity:0; cursor:pointer; }
  label:has(input:focus-visible) { outline:1px solid var(--teal); outline-offset:1px; }
  @media(pointer:coarse){ label { height:40px; } }
</style>
