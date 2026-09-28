<script lang="ts">
  import Stage1Select from '$lib/components/Stage1Select.svelte';
  import type { Doc } from '../../../convex/_generated/dataModel';
  type Props = {
    showcase: Doc<'showcases'>;
    publications: Doc<'publications'>[];
    assets: Doc<'videos'>[];
  };
  let { showcase, publications, assets }: Props = $props();
  let order = $state<string[]>([]);
  $effect(() => { order = [...showcase.publicationIds]; });
  let pick = $state('');
  function title(id: string) {
    return assets.find((asset) => asset._id === publications.find((item) => item._id === id)?.assetId)?.title ?? 'Unavailable video';
  }
  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= order.length) return;
    const next = [...order]; [next[index], next[target]] = [next[target], next[index]]; order = next;
  }
</script>
<details class="editor"><summary>{showcase.title} · edit order and membership</summary>
  <form method="POST" action="/studio?/saveShowcase">
    <input type="hidden" name="showcaseId" value={showcase._id} />
    <label>Title <input name="title" value={showcase.title} required maxlength="120" /></label>
    <label>Allowed site origins <input name="origins" value={showcase.allowedOrigins.join(', ')} required /></label>
    <div class="add"><div class="field"><span>Add published video</span><Stage1Select label="Add published video" items={publications.filter((item) => !item.revokedAt).map((item) => ({ value: item._id, label: title(item._id) }))} placeholder="Choose video" bind:value={pick} /></div><button type="button" onclick={() => { if (pick && !order.includes(pick)) order = [...order, pick]; }}>Add</button></div>
    <ol>{#each order as id, index (id)}<li><input type="hidden" name="publicationIds" value={id}/><span>{title(id)}</span><button type="button" onclick={() => move(index, -1)} aria-label={`Move ${title(id)} up`}>↑</button><button type="button" onclick={() => move(index, 1)} aria-label={`Move ${title(id)} down`}>↓</button><button type="button" onclick={() => order = order.filter((item) => item !== id)}>Remove</button></li>{/each}</ol>
    <button class="save">Save showcase</button>
  </form>
</details>
<style>.editor{border-top:1px solid var(--border);padding:12px 0}.editor summary{cursor:pointer;color:var(--teal);font-size:11px}form{display:grid;gap:12px;margin:12px 0}label,.field{display:grid;gap:6px;color:var(--muted);font-size:11px}input{background:var(--canvas);color:var(--ink);border:1px solid var(--border);border-radius:5px;padding:9px;width:100%;font-size:12px}.add{display:flex;align-items:end;gap:10px}.add .field{flex:1;min-width:0}ol{padding-left:18px}li{display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap}li span{flex:1}button{background:var(--raised);border:1px solid var(--border);padding:7px 10px;border-radius:5px;font-size:11px}button.save{background:var(--accent);justify-self:start}</style>
