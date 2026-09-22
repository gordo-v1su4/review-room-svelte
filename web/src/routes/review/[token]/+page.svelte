<script lang="ts">
  import { page } from '$app/state';
  import ReviewAccessGate from '$lib/public-review/ReviewAccessGate.svelte';
  import { offlinePublicReviewGateway } from '$lib/public-review-access';
</script>

<svelte:head>
  <title>Review room.</title>
  <meta name="robots" content="noindex, nofollow"/>
  <meta name="referrer" content="no-referrer"/>
</svelte:head>

<!-- Keep public media fail-closed until the server-validated share adapter is connected. -->
<ReviewAccessGate token={page.params.token ?? ''} gateway={offlinePublicReviewGateway}>
  {#snippet children()}<p role="status">Opening review…</p>{/snippet}
</ReviewAccessGate>
