<script lang="ts">
  import { page } from '$app/state';
  import ReviewAccessGate from '$lib/public-review/ReviewAccessGate.svelte';
  import SharedReview from '$lib/public-review/SharedReview.svelte';
  import { offlineSharedReviewGateway, type SharedReviewPayload } from '$lib/public-review/shared-review';
  import type { PublicReviewGateway } from '$lib/public-review-access';
  import { offlinePublicReviewGateway } from '$lib/public-review-access';
  const gateway: PublicReviewGateway<SharedReviewPayload> = offlinePublicReviewGateway;
</script>

<svelte:head>
  <title>Review room.</title>
  <meta name="robots" content="noindex, nofollow"/>
  <meta name="referrer" content="no-referrer"/>
</svelte:head>

<!-- Keep public media fail-closed until the server-validated share adapter is connected. -->
<ReviewAccessGate token={page.params.token ?? ''} {gateway}>
  {#snippet children(access)}<SharedReview payload={access.data} reviewerName={access.viewerName} gateway={offlineSharedReviewGateway}/>{/snippet}
</ReviewAccessGate>
