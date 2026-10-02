<script lang="ts">
  import SelectionBar from '$lib/components/SelectionBar.svelte';
  const noop=()=>{};
</script>
<h1>Client selected asset actions</h1>
<SelectionBar count={1} visibleCount={1} access={{kind:'share'}} selectedAssets={[{id:'client-clip',title:'Client clip'}]} onDelete={async()=>{throw new Error('Client cannot delete');}} onselectvisible={noop} onclear={noop} onshortlist={noop} onstatus={noop} onrate={noop}/>
