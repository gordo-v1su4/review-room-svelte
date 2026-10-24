import type { PageServerLoad } from './$types';
import { requireOwner } from '$lib/server/owner-auth';

export const load: PageServerLoad = ({ cookies }) => {
  requireOwner(cookies);
  // Private operational content travels only in authorized server responses.
  return { sections: [
    { title: 'Connect the dedicated setup', paragraphs: [
      'The frontend runs on App VM at https://review.v1su4.dev. Convex owns the catalog at https://review-convex.v1su4.dev; its site endpoint is https://review-convex-site.v1su4.dev. RustFS stores this application’s bytes in the private review-room-svelte bucket. Trigger.dev coordinates the video jobs; workers run FFmpeg on VM100.',
      'For a connected local workspace, populate the ignored .env.local using this app’s dedicated BWS records and the canonical deployment runbook. Never copy another app’s environment. Restart Vite after configuration changes. Local and production owner sessions are separate, but a local workspace pointed at the production backend changes the same data.',
      'Run bun install --frozen-lockfile, then bun dev at http://127.0.0.1:5173. Inspect an occupied port before starting another instance. Without backend settings, the checkout is a local-media preview; it cannot certify persistence or permissions.',
    ] },
    { title: 'Storage and network responsibilities', paragraphs: [
      'Keep catalog metadata in Convex and original/derivative objects in RustFS. Browser uploads use presigned storage requests; application servers authorize them and verify completion. Bucket CORS must include the exact frontend origin. A production origin does not cover localhost; preserve unrelated CORS rules and keep the bucket private.',
      'Caddy routes the canonical frontend hostname to App VM’s loopback port 18094. The former review-room.v1su4.dev hostname is retired. Use the dedicated Convex backend and site endpoints; they are separate deployment surfaces. Neither a healthy frontend container nor a reachable storage endpoint proves the full upload-to-review journey works.',
      'Existing production credentials stay in the protected App VM environment and BWS. Do not expose server variables as PUBLIC_ settings, commit .env files, or copy signed URLs into tickets. The runbook lists configuration names and ownership without publishing secret values.',
    ] },
    { title: 'Deployment and recovery', paragraphs: [
      'The personal repository gordo-v1su4/review-room-svelte is the release source. The Deploy to App VM workflow deploys pushes to main and supports an explicit main-branch dispatch. It runs on the repository-scoped production runner. Review Room does not deploy to Vercel, Hostinger or Buzero.',
      'Before releasing, run bun run check, bun test and bun run build, review the diff and preserve unrelated work. The deployment script exports the exact commit, builds the frontend image, deploys the dedicated Convex backend and updates the Dockhand stack. Frontend and backend are distinct surfaces and both require verification when touched.',
      'Dockhand owns the frontend as an Internal stack in its app-vm environment. Build and verify a replacement image before changing its pinned tag. Local release images use pull_policy: never. Keep the previous image and Compose configuration available; release exports live under /home/gordo/review-room-svelte-releases/<commit>.',
      'If frontend activation or verification fails, the deployment script restores the previous Dockhand image. That does not roll back Convex. Before any backend rollback, review schema compatibility and the runbook. Restore data only from a verified backup with an explicit recovery plan; never replace the persistent volume as a shortcut.',
      'After recovery, verify the public build identity, anonymous workspace redirect, owner sign-in, direct owner-doc access, a private reviewer link and the touched upload/playback or publication journey. Record exact commit, image, backend revision, result and coverage limits. Existing desktop evidence is not a physical iPhone or Android test.',
    ] },
    { title: 'Diagnose by the failed handoff', paragraphs: [
      'Upload failure: inspect the per-file Imports state, exact destination, storage response and CORS origin. Retry the existing session after an uncertain receipt. Processing failure: inspect Activity and the exact version/job, then use its safe Retry control; a new upload can create a duplicate.',
      'Playback failure: distinguish not-ready processing, unavailable access, interrupted delivery and decoder failure. Retry the authorized current source, then check range responses, MIME type and visible decoded frames. A running timer alone does not prove visible playback.',
      'Publishing failure: inspect the saved exact-version sync operation and retry that operation. Refresh, Unsync and Sync again have different consent and recovery semantics. Preserve canonical media and target edits. Do not clear the catalog to repair a connection.',
    ] },
  ] };
};
