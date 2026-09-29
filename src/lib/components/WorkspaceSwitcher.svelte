<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import { Check, ChevronDown } from 'lucide-svelte';
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger class="workspace-switcher-trigger" aria-label="Workspace: V1su4" title="Switch workspace">
    <span>V1su4</span><ChevronDown size={15} aria-hidden="true"/>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content class="workspace-switcher-menu" sideOffset={5} align="start" collisionPadding={12} aria-label="Workspaces">
      <DropdownMenu.RadioGroup value="v1su4">
        <DropdownMenu.GroupHeading class="workspace-menu-heading">Workspaces</DropdownMenu.GroupHeading>
        <DropdownMenu.RadioItem class="workspace-switcher-option" value="v1su4">
          <span>V1su4</span><Check size={14} aria-hidden="true"/>
        </DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem class="workspace-switcher-option" value="buzero" disabled>
          <span>Buzero</span><small>Coming soon</small>
        </DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
  :global(.workspace-switcher-trigger) {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    flex-shrink: 0;
    align-self: flex-start;
    min-height: 34px;
    margin-bottom: 24px;
    padding: 6px 8px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ink);
    text-align: left;
    font-size: 13px;
    font-weight: 560;
  }
  :global(.workspace-switcher-trigger:hover),
  :global(.workspace-switcher-trigger[data-state='open']) { color: #f2f5f3; }
  :global(.workspace-switcher-trigger svg) { color: var(--muted); }
  :global(.workspace-switcher-menu) {
    box-sizing: border-box;
    z-index: 80;
    width: min(192px, calc(100vw - 24px));
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--panel);
    color: var(--ink);
    box-shadow: 0 10px 36px #0006;
    outline: none;
  }
  :global(.workspace-menu-heading) { display: block; margin-bottom: 9px; font-size: 12px; font-weight: 550; }
  :global(.workspace-switcher-option) { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 0 8px; border-radius: 4px; color: var(--ink); font-size: 12px; cursor: pointer; outline: none; }
  :global(.workspace-switcher-option[data-highlighted]),
  :global(.workspace-switcher-option[data-state='checked']) { background: color-mix(in srgb, var(--accent) 20%, var(--panel)); }
  :global(.workspace-switcher-option svg) { margin-left: auto; color: var(--teal); }
  :global(.workspace-switcher-option[data-disabled]) { color: var(--muted); cursor: default; }
  :global(.workspace-switcher-option small) { margin-left: auto; font-size: 10px; }
  @media (pointer: coarse) {
    :global(.workspace-switcher-trigger) { min-height: 44px; }
  }
</style>
