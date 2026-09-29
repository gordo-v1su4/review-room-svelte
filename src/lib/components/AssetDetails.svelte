<script lang="ts">
  import { Plus, Search, X } from 'lucide-svelte';
  import type { ReviewAsset } from '$lib/review';
  import type { AssetReview } from '$lib/review-session';
  import { filterMetadataFields, normalizeCreativeMetadata, normalizeTags, type AssetMetadataPatch, type CreativeMetadata, type CustomMetadataField, type MetadataField, type MetadataFilter } from '$lib/asset-metadata';
  let { asset, review, knownTags = [], canEdit = false, onChange }: { asset: ReviewAsset; review?: AssetReview; knownTags?: readonly string[]; canEdit?: boolean; onChange: (id: string, patch: AssetMetadataPatch) => void } = $props();
  const uid = $props.id();
  let group = $state<MetadataFilter['group']>('all');
  let presence = $state<MetadataFilter['presence']>('all');
  let search = $state('');
  let tagDrafts = $state<Record<string, string>>({});
  type CustomFieldDraft = { name: string; kind: CustomMetadataField['kind']; open: boolean };
  let customDrafts = $state<Record<string, CustomFieldDraft>>({});
  let customDraft = $derived(customDrafts[asset.id] ?? { name: '', kind: 'text' as const, open: false });
  const groups = ['all', 'essentials', 'review', 'file', 'tags', 'creative'] as const;
  const states = ['all', 'empty', 'filled'] as const;
  const kinds = ['text', 'number', 'boolean', 'date'] as const;
  let metadata = $derived(normalizeCreativeMetadata(asset.metadata));
  let suggestions = $derived(normalizeTags(knownTags).filter(tag => !asset.tags.some(existing => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())));
  let rows = $derived<MetadataField[]>([
    { id: 'status', label: 'Status', group: 'essentials', value: review?.status.replaceAll('_', ' ') },
    { id: 'rating', label: 'Rating', group: 'essentials', value: review?.rating ? `${review.rating} / 5` : null },
    { id: 'shortlist', label: 'Shortlist', group: 'essentials', value: review ? (review.shortlisted ? 'Selected' : 'Not selected') : null, filled: review?.shortlisted ?? false },
    { id: 'assetClass', label: 'Asset class', group: 'essentials', value: asset.assetClass },
    { id: 'assetCode', label: 'Asset code', group: 'essentials', value: asset.assetCode },
    { id: 'viewed', label: 'Viewed', group: 'review', value: review ? (review.viewed ? 'Yes' : 'No') : null },
    { id: 'comments', label: 'Comments', group: 'review', value: review?.comments.length ?? null, filled: Boolean(review?.comments.length) },
    { id: 'attention', label: 'Needs attention', group: 'review', value: review ? (review.feedbackNeedsAttention ? 'Yes' : 'No') : null, filled: review?.feedbackNeedsAttention ?? false },
    { id: 'filename', label: 'Filename', group: 'file', value: asset.sourceFile.name },
    { id: 'size', label: 'File size', group: 'file', value: `${(asset.size / 1048576).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB` },
    { id: 'mime', label: 'MIME type', group: 'file', value: asset.sourceFile.type },
    { id: 'resolution', label: 'Resolution', group: 'file', value: asset.width && asset.height ? `${asset.width} × ${asset.height}` : null },
    { id: 'ratio', label: 'Aspect ratio', group: 'file', value: asset.width && asset.height ? `${(asset.width / asset.height).toFixed(2)}:1` : null },
    { id: 'duration', label: 'Duration', group: 'file', value: asset.duration !== undefined && Number.isFinite(asset.duration) ? `${asset.duration.toFixed(2)} s` : null },
    { id: 'fps', label: 'Frame rate (estimated)', group: 'file', value: asset.fps ? `≈${Number(asset.fps.toFixed(2))} fps` : null },
    { id: 'codec', label: 'Codec', group: 'file', value: asset.codec },
    { id: 'importedAt', label: 'Added locally', group: 'file', value: asset.importedAt ? new Date(asset.importedAt).toLocaleString() : null },
    { id: 'tags', label: 'Tags', group: 'tags', value: asset.tags.join(', ') },
    { id: 'notes', label: 'Production notes', group: 'creative', value: metadata.notes },
    { id: 'prompt', label: 'Prompt', group: 'creative', value: metadata.prompt },
    { id: 'model', label: 'Model', group: 'creative', value: metadata.model },
    { id: 'releaseDate', label: 'Release date', group: 'creative', value: metadata.releaseDate },
    { id: 'releasePlatforms', label: 'Release platforms', group: 'creative', value: metadata.releasePlatforms.join(', ') },
    ...metadata.customFields.map(field => ({ id: `custom:${field.id}`, label: field.label, group: 'creative' as const, value: field.value }))
  ]);
  let visible = $derived(filterMetadataFields(rows, { group, presence, search }));
  function change(patch: AssetMetadataPatch) { if (canEdit) onChange(asset.id, patch); }
  function changeCreative(patch: Partial<CreativeMetadata>) { change({ metadata: normalizeCreativeMetadata({ ...metadata, ...patch }) }); }
  function addTags(value: string) { if (canEdit) { change({ tags: normalizeTags([...asset.tags, ...value.split(',')]) }); tagDrafts[asset.id] = ''; } }
  function editCustom(field: CustomMetadataField, raw: string) {
    let next: CustomMetadataField;
    if (field.kind === 'number') next = { ...field, value: raw.trim() && Number.isFinite(Number(raw)) ? Number(raw) : null };
    else if (field.kind === 'boolean') next = { ...field, value: raw === 'true' ? true : raw === 'false' ? false : null };
    else next = { ...field, value: raw };
    changeCreative({ customFields: metadata.customFields.map(item => item.id === field.id ? next : item) });
  }
  function updateCustomDraft(patch: Partial<CustomFieldDraft>) {
    customDrafts[asset.id] = { ...customDraft, ...patch };
  }
  function addField() {
    const { name: customName, kind: customKind } = customDraft;
    if (!canEdit || !customName.trim()) return;
    const base = { id: crypto.randomUUID(), label: customName.trim() };
    const field: CustomMetadataField = customKind === 'number' ? { ...base, kind: 'number', value: null } : customKind === 'boolean' ? { ...base, kind: 'boolean', value: null } : { ...base, kind: customKind, value: '' };
    changeCreative({ customFields: [...metadata.customFields, field] });
    updateCustomDraft({ name: '', open: false }); group = 'creative'; presence = 'all'; search = '';
  }
</script>
<section class="asset-fields" aria-label="Asset metadata">
  <div class="field-tools">
    <div class="group-options" aria-label="Field groups">{#each groups as item (item)}<button type="button" class:chosen={group === item} aria-pressed={group === item} onclick={() => group = item}>{item}</button>{/each}</div>
    <div class="field-search"><Search size={13} aria-hidden="true"/><input aria-label="Search metadata fields" placeholder="Search fields" bind:value={search}/><select aria-label="Field completeness" bind:value={presence}>{#each states as item (item)}<option value={item}>{item === 'all' ? 'All fields' : item === 'empty' ? 'Empty' : 'Filled'}</option>{/each}</select></div>
  </div>
  <div class="field-list">
    {#each visible as row (row.id)}
      {@const custom = row.id.startsWith('custom:') ? metadata.customFields.find(field => `custom:${field.id}` === row.id) : undefined}
      <div class:wide={['tags', 'notes', 'prompt', 'releasePlatforms'].includes(row.id)} class="field-row">
        <label for={`metadata-${uid}-${asset.id}-${row.id}`}>{row.label}</label>
        <div class="field-value">
          {#if row.id === 'assetClass' && canEdit}
            <select id={`metadata-${uid}-${asset.id}-${row.id}`} aria-label="Asset class" value={asset.assetClass} onchange={event => { const value = event.currentTarget.value; if (value === 'VID' || value === 'IMG' || value === 'CTX' || value === 'STB') change({ assetClass: value }); }}>{#if asset.type === 'video'}<option value="VID">Video · VID</option>{:else}<option value="IMG">Image · IMG</option><option value="CTX">Contact sheet · CTX</option><option value="STB">Storyboard · STB</option>{/if}</select>
          {:else if row.id === 'tags'}
            <div class="tags">{#each asset.tags as tag (tag)}<span class="tag chip preset-tonal-surface">{tag}{#if canEdit}<button type="button" aria-label={`Remove tag ${tag}`} onclick={() => change({ tags: asset.tags.filter(item => item !== tag) })}><X size={11}/></button>{/if}</span>{/each}{#if !asset.tags.length && !canEdit}<span class="empty-value">—</span>{/if}</div>
            {#if canEdit}<form class="tag-entry" onsubmit={event => { event.preventDefault(); addTags(tagDrafts[asset.id] ?? ''); }}><input id={`metadata-${uid}-${asset.id}-${row.id}`} aria-label="Add tags" placeholder="Add tags…" list={`tag-suggestions-${uid}-${asset.id}`} maxlength="500" value={tagDrafts[asset.id] ?? ''} oninput={event => tagDrafts[asset.id] = event.currentTarget.value}/><button type="submit" aria-label="Add tags" disabled={!tagDrafts[asset.id]?.trim()}><Plus size={14}/></button><datalist id={`tag-suggestions-${uid}-${asset.id}`}>{#each suggestions as tag (tag)}<option value={tag}></option>{/each}</datalist></form>{/if}
          {:else if (row.id === 'notes' || row.id === 'prompt') && canEdit}
            <textarea id={`metadata-${uid}-${asset.id}-${row.id}`} aria-label={row.label} rows="3" value={row.value as string} placeholder="—" onchange={event => changeCreative({ [row.id]: event.currentTarget.value })}></textarea>
          {:else if (row.id === 'model' || row.id === 'releaseDate' || row.id === 'releasePlatforms') && canEdit}
            <input id={`metadata-${uid}-${asset.id}-${row.id}`} aria-label={row.label} type={row.id === 'releaseDate' ? 'date' : 'text'} value={row.value as string} placeholder={row.id === 'releasePlatforms' ? 'Web, Instagram, cinema…' : '—'} onchange={event => changeCreative(row.id === 'releasePlatforms' ? { releasePlatforms: normalizeTags(event.currentTarget.value.split(',')) } : { [row.id]: event.currentTarget.value })}/>
          {:else if custom && canEdit}
            <div class="custom-control">{#if custom.kind === 'boolean'}<select id={`metadata-${uid}-${asset.id}-${row.id}`} aria-label={custom.label} value={custom.value === null ? '' : String(custom.value)} onchange={event => editCustom(custom, event.currentTarget.value)}><option value="">—</option><option value="true">Yes</option><option value="false">No</option></select>{:else}<input id={`metadata-${uid}-${asset.id}-${row.id}`} aria-label={custom.label} type={custom.kind === 'number' ? 'number' : custom.kind === 'date' ? 'date' : 'text'} step={custom.kind === 'number' ? 'any' : undefined} value={custom.value ?? ''} placeholder="—" onchange={event => editCustom(custom, event.currentTarget.value)}/>{/if}<button type="button" class="remove-field" aria-label={`Remove field ${custom.label}`} onclick={() => changeCreative({ customFields: metadata.customFields.filter(field => field.id !== custom.id) })}><X size={12}/></button></div>
          {:else}<span id={`metadata-${uid}-${asset.id}-${row.id}`} class:empty-value={row.value === null || row.value === undefined || row.value === ''}>{row.value === null || row.value === undefined || row.value === '' ? '—' : typeof row.value === 'boolean' ? (row.value ? 'Yes' : 'No') : row.value}</span>{/if}
        </div>
      </div>
    {:else}<p class="no-fields">No fields match these filters.</p>{/each}
  </div>
  {#if canEdit && (group === 'all' || group === 'creative')}
    <div class="custom-fields">{#if customDraft.open}<form onsubmit={event => { event.preventDefault(); addField(); }}><input aria-label="Custom field name" placeholder="Field name" maxlength="80" value={customDraft.name} oninput={event => updateCustomDraft({ name: event.currentTarget.value })} required/><select aria-label="Custom field type" value={customDraft.kind} onchange={event => { const kind = event.currentTarget.value; if (kind === 'text' || kind === 'number' || kind === 'boolean' || kind === 'date') updateCustomDraft({ kind }); }}>{#each kinds as kind (kind)}<option value={kind}>{kind === 'boolean' ? 'Yes / No' : kind[0].toUpperCase() + kind.slice(1)}</option>{/each}</select><div class="custom-actions"><button type="button" onclick={() => updateCustomDraft({ open: false })}>Cancel</button><button type="submit" class="chosen" disabled={!customDraft.name.trim()}>Add field</button></div></form>{:else}<button type="button" class="add-field" onclick={() => updateCustomDraft({ open: true })}><Plus size={13}/> Add field</button>{/if}</div>
  {/if}
</section>
<style>
  .asset-fields { min-width: 0; font-size: 11px; color: var(--ink); }
  .field-tools { padding: 12px 0; border-bottom: 1px solid var(--border); display: grid; gap: 10px; }
  .group-options { display: flex; flex-wrap: wrap; gap: 3px; }
  button { font: inherit; color: var(--muted); border: 0; background: transparent; border-radius: 4px; cursor: pointer; }
  button:disabled { opacity: .4; cursor: default; }
  button:hover:not(:disabled) { color: var(--ink); background: var(--raised); }
  .group-options button { padding: 5px 7px; text-transform: capitalize; }
  button.chosen { color: var(--ink); background: color-mix(in srgb, var(--accent, #62b9aa) 12%, var(--panel)); }
  .field-search { display: flex; align-items: center; gap: 5px; color: var(--muted); }
  .field-search input { flex: 1; width: 0; }
  .field-search select { width: 80px; padding-left: 4px; }
  input,select,textarea { min-width: 0; width: 100%; color: var(--ink); background: var(--canvas); font: inherit; border: 1px solid var(--border); border-radius: 4px; padding: 6px 7px; }
  input,select { height: 30px; }
  textarea { resize: vertical; line-height: 1.6; }
  input::placeholder,textarea::placeholder { color: var(--muted); opacity: .7; }
  input:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible { outline: 1px solid var(--accent, #62b9aa); outline-offset: 2px; }
  .field-row { display: grid; grid-template-columns: minmax(70px, .85fr) minmax(0, 1.3fr); gap: 12px; align-items: start; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .field-row label { color: var(--muted); padding-top: 6px; line-height: 1.4; }
  .field-value { min-width: 0; overflow-wrap: anywhere; line-height: 1.5; }
  .field-value > span { display: block; padding: 6px 0; white-space: pre-wrap; }
  .field-row.wide { grid-template-columns: minmax(0, 1fr); gap: 7px; }
  .field-row.wide label { padding: 0; }
  .empty-value { color: var(--muted); }
  .tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .tag { max-width: 100%; overflow-wrap: anywhere; display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 3px 6px; border-radius: 4px; background: var(--raised); }
  .tag button { display: grid; place-items: center; width: 18px; height: 18px; }
  .tag-entry { display: flex; align-items: center; gap: 4px; margin-top: 7px; }
  .tag-entry button { height: 30px; width: 30px; flex: 0 0 30px; display: grid; place-items: center; }
  .custom-control { display: flex; align-items: center; gap: 3px; }
  .remove-field { flex: 0 0 24px; height: 30px; display: grid; place-items: center; }
  .custom-fields { padding: 12px 0; }
  .custom-fields form { display: grid; gap: 7px; }
  .custom-actions { display: flex; justify-content: end; gap: 5px; }
  .custom-actions button { padding: 7px 10px; }
  .add-field { display: flex; align-items: center; gap: 6px; padding: 6px 0; }
  .no-fields { color: var(--muted); padding: 18px 0; }
  @media (pointer: coarse) { input,select,.tag-entry button { height: 44px; } input,select,textarea { font-size: 16px; } .group-options button,.custom-actions button,.add-field { min-height: 44px; } .tag button { min-width: 28px; min-height: 28px; } .remove-field { flex-basis: 36px; height: 44px; } }
</style>
