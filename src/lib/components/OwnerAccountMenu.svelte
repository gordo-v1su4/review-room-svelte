<script lang="ts">
  import { Popover } from 'bits-ui';
  import { UserRound } from 'lucide-svelte';
</script>

<Popover.Root>
  <Popover.Trigger class="icon-button owner-account" aria-label="Account" title="Account"><UserRound size={16}/></Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="owner-account-menu" sideOffset={8} align="end" collisionPadding={12}>
      <strong>Workspace owner</strong>
      <p>Signed in to your private Review Room workspace.</p>
      <form method="POST" action="/studio?/logout">
        <button type="submit">Sign out</button>
      </form>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  :global(.owner-account-menu) { width:220px; padding:14px; border:1px solid var(--border); border-radius:8px; background:var(--raised); color:var(--ink); box-shadow:0 12px 32px #0008; }
  :global(.owner-account-menu strong) { font-size:12px; font-weight:550; }
  :global(.owner-account-menu p) { margin:6px 0 0; color:var(--muted); font-size:11px; line-height:1.5; }
  :global(.owner-account-menu form) { margin-top:12px; }
  :global(.owner-account-menu button) { width:100%; min-height:36px; padding:8px 10px; border:0; border-radius:5px; background:var(--surface); color:var(--ink); font-size:12px; text-align:left; cursor:pointer; }
  :global(.owner-account-menu button:hover) { background:var(--raised); }
  @media (pointer:coarse) { :global(.owner-account-menu button) { min-height:44px; } }
</style>
