import type { ReviewAsset } from '$lib/review';
import type { AssetReview } from '$lib/review-session';
import type { SharedReviewGateway } from '$lib/shared-review-session';

/** Only authorized, sanitized data belongs here; the public server owns asset/link scope. */
export type SharedReviewAsset = ReviewAsset & {
  review: AssetReview;
  downloadEnabled: boolean;
  sourceBlob?: Blob;
};
export type SharedReviewPayload = {
  project: { id: string; title: string; description?: string; canDownload: boolean; appearance?: unknown };
  assets: readonly SharedReviewAsset[];
};
export const offlineSharedReviewGateway: SharedReviewGateway = {
  async commit() { throw new Error('Review service unavailable'); }
};
