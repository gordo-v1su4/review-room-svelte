import { task } from '@trigger.dev/sdk';

export const reviewRoomHealth = task({
  id: 'review-room-service-health',
  queue: { concurrencyLimit: 2 },
  retry: { maxAttempts: 1 },
  run: async (payload: { assetId: string; simulateFailure?: boolean }) => {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(payload.assetId)) throw new Error('Invalid asset ID');
    const url = process.env.REVIEW_ROOM_CONVEX_URL ?? 'https://review-convex.v1su4.dev';
    const response = await fetch(new URL('/version', url), { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Review Room Convex health check failed (${response.status})`);
    if (payload.simulateFailure) throw new Error('Review Room smoke failure injection');
    return { assetId: payload.assetId, convexHealthy: true };
  },
});
