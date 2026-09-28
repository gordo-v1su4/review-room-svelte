<script lang="ts">
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
    <div class="add"><label>Add published video <select bind:value={pick}><option value="">Choose video</option>{#each publications.filter((item) => !item.revokedAt) as item}<option value={item._id}>{title(item._id)}</option>{/each}</select></label><button type="button" onclick={() => { if (pick && !order.includes(pick)) order = [...order, pick]; }}>Add</button></div>
    <ol>{#each order as id, index (id)}<li><input type="hidden" name="publicationIds" value={id}/><span>{title(id)}</span><button type="button" onclick={() => move(index, -1)} aria-label={`Move ${title(id)} up`}>↑</button><button type="button" onclick={() => move(index, 1)} aria-label={`Move ${title(id)} down`}>↓</button><button type="button" onclick={() => order = order.filter((item) => item !== id)}>Remove</button></li>{/each}</ol>
    <button class="save">Save showcase</button>
  </form>
</details>
<style>.editor{border-top:1px solid var(--border);padding:12px 0}.editor summary{cursor:pointer;color:var(--teal)}form{display:grid;gap:12px;margin:12px 0}label{display:grid;gap:6px;color:var(--muted);font-size:13px}input,select{background:var(--raised);color:var(--ink);border:1px solid var(--control-border);border-radius:8px;padding:10px;width:100%}.add{display:flex;align-items:end;gap:10px}.add label{flex:1}ol{padding-left:18px}li{display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap}li span{flex:1}button{background:var(--raised);border:1px solid var(--control-border);padding:9px 12px;border-radius:8px}button.save{background:var(--accent);justify-self:start}</style>
