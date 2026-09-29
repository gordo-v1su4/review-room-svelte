import { tasks } from '@trigger.dev/sdk';

const assetId = process.argv[2] ?? 'stage2-smoke-001';
if (!/^[a-zA-Z0-9_-]{1,100}$/.test(assetId)) throw new Error('Invalid asset ID');

const run = await tasks.trigger('review-room-service-health', {
  assetId,
  simulateFailure: process.argv.includes('--fail'),
});
console.log(run.id);
