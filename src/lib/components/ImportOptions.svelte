<script lang="ts">
  import Stage1Select from './Stage1Select.svelte';
  import { Popover } from 'bits-ui';
  import { SlidersHorizontal, X } from 'lucide-svelte';

  type AssetClass = 'VID' | 'IMG' | 'CTX' | 'STB';
  let { folders, folderId, assetClass, persistent = false, onChange }: {
    folders: readonly { id: string; title: string }[];
    folderId: string | null;
    assetClass: AssetClass;
    persistent?: boolean;
    onChange: (value: { folderId: string | null; assetClass: AssetClass }) => void;
  } = $props();

  let imageClass = $derived(assetClass === 'VID' ? 'IMG' : assetClass);

  function changeImageClass(value: string) {
    if (value === 'IMG' || value === 'CTX' || value === 'STB') {
      onChange({ folderId, assetClass: value });
    }
  }
</script>

<Popover.Root>
  <Popover.Trigger class="import-options-trigger" aria-label="Import options" title="Import options">
    <SlidersHorizontal size={14} aria-hidden="true"/>
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="import-options-popover" aria-label="Import options" align="end" sideOffset={6} collisionPadding={12}>
      <div class="import-options-heading">
        <h2>Import options</h2>
        <Popover.Close class="publishing-close" aria-label="Close import options"><X size={15} aria-hidden="true"/></Popover.Close>
      </div>
      <div class="import-options-field">Destination<Stage1Select label="Upload destination" value={folderId ?? '__root__'} items={[{value:'__root__',label:'Project root'},...folders.map(folder => ({value:folder.id,label:folder.title}))]} onValueChange={value => onChange({folderId:value === '__root__' ? null : value,assetClass})}/></div>
      <div class="import-options-field">Image classification<Stage1Select label="Image classification" value={imageClass} items={[{value:'IMG',label:'Images'},{value:'CTX',label:'Contact sheets'},{value:'STB',label:'Storyboards'}]} onValueChange={changeImageClass}/></div>
      <p>Videos keep their video type.</p>
      <p class="import-options-local">{persistent ? 'Files are saved privately to your workspace.' : 'Files stay on this device.'}</p>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  :global(.import-options-trigger) { display: inline-grid; place-items: center; flex-shrink: 0; width: 30px; height: 30px; padding: 0; border: 1px solid var(--border); border-radius: 5px; background: var(--panel); color: var(--ink); cursor: pointer; }
  :global(.import-options-trigger:hover), :global(.import-options-trigger[data-state='open']) { background: color-mix(in srgb, var(--accent) 12%, var(--panel)); }
  :global(.import-options-popover) { box-sizing: border-box; z-index: 80; width: min(272px, calc(100vw - 24px)); max-height: min(var(--bits-popover-content-available-height), calc(100dvh - 24px)); overflow-y: auto; padding: 12px; border: 1px solid var(--border); border-radius: 7px; background:color-mix(in srgb,var(--raised) 68%,transparent);backdrop-filter:blur(18px);color:var(--ink);box-shadow:inset 0 1px #d3eee609,0 16px 50px #0006;outline:none; }
  .import-options-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  h2 { margin: 0; font-size: 12px; font-weight: 550; }
  .import-options-field { display: grid; gap: 6px; margin-top: 12px; color: var(--muted); font-size: 11px; }
  p { margin: 8px 0 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
  .import-options-local { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); }
  :global(.import-options-trigger:focus-visible) { outline: 1px solid var(--accent); outline-offset: 2px; }
  @media (pointer: coarse) { :global(.import-options-trigger) { width: 44px; height: 44px; } }
</style>
