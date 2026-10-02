# V1S-135 — same-page processing completion

Branch: `codex/v1s-135-processing-completion`. V1S-135 deployment acceptance passed on October 2, 2026.

The user agreed the test seam on October 2, 2026: the real mounted workspace with a controlled asynchronous processing transport, asserting browser-visible badge, thumbnail and native playback state. Tests do not mock the player or dispatch synthetic media events.

## Local regression

Install dependencies with `bun install` and Chromium with `bunx playwright install chromium`. With FFmpeg available on PATH, start `bun dev --strictPort`, then run `bun run test:processing` in another terminal. The default test URL is `http://127.0.0.1:5173`; override with `PROCESSING_TEST_URL` if intentionally testing another local port.

The script generates a four-second H.264 MP4 and JPEG under ignored `output/playwright/`. Existing media may be supplied with `PROCESSING_TEST_CLIP` and `PROCESSING_TEST_POSTER`. The development-only `/dev/processing-workspace` mounts the production workspace with typed fixtures and returns 404 outside development.

Covered behavior:

- Queued → running → ready changes the badge, loads the poster and decodes video without navigation/reload.
- Older version and processing-attempt results cannot replace the current source.
- A pending response resolving after an asset switch preserves the selected asset.
- Transient transport failures retain ready playback, a paused playhead, the current folder and an unsent comment; subsequent metadata proves recovery.
- Unmount stops polling and ignores a pending response.
- The real processing endpoint redirects an unauthenticated request before backend access.

The first test failed on the original mount-only snapshot. The older-version test separately failed before version-number checks were added. Screenshot: `output/playwright/processing-ready.png`.

## Release acceptance

Local transport fixtures do not prove live authorization, uploads, persistence or Trigger integration. The deployed journey below supplies that evidence.

### Deployed evidence — October 2, 2026

The user confirmed the App VM target. Convex functions were deployed to `https://review-convex.v1su4.dev` before the frontend from commit `97404ee7208d1b487dd029af7a1273b79eb02792` ([PR #8](https://github.com/gordo-v1su4/review-room-svelte/pull/8)). Frontend container is healthy with image `sha256:cc07e9f14a73d81704290e393e3f00c9ee37a0b81226bfcc9e647b7ed5087031`. Trigger code was unchanged. Rollback image tag on App VM: `review-room-svelte-app-app:rollback-v1s135`; source backup: `/home/gordo/review-room-pre-v1s135.tgz`.

Owner recovery sign-in and a real browser upload passed at `https://review-room.v1su4.dev`. Upload initially exposed missing App VM origin in the private bucket's CORS; the exact origin was added while preserving existing rules, as recorded in the deployment guide.

The final upload in the private `V1S-135 verification` project is asset `m97927vtws5q60j72r6c51nf418fh25q`, job `n171sjwhp6ksvgvdz99ppteg098fhkgp`, Trigger run ending `axquz2mv`, displayed as `VID_20261002_00019`. The review was opened while queued. Actual processing responses progressed through running/verify, running/derivatives, running/finalize and ready. The badge changed to Ready, poster decoded, and the main native player reached readyState 4 at 1920×1080 and played past 1.01 seconds. Navigation count after opening was zero; the project, Videos collection and selected asset remained unchanged. The normal upload-finalization reload occurred before opening the review and is excluded from this assertion.

Local ignored evidence: `output/playwright/live-proof.json`, `live-upload.png` and `live-workspace.png`. The ready screenshot was visually inspected. The private verification project retains six synthetic clips from browser verification; no publication was created. Stale results, retry attempt protection, transport recovery, draft/playhead preservation and unmount behavior are proven by the seven controlled browser regressions above.

### Codex in-app Browser proof

At the user's request, repeated the real upload through the visible Codex `@Browser`, signing in with the existing owner recovery credential from live BWS. Fresh asset `VID_20261002_00020` was opened with the derivatives-in-progress badge and unavailable playback. Without refresh or navigation, its badge changed to Ready and the player became usable. Clicking Play advanced actual 1920×1080 native video to 11.406136 seconds with readyState 4 and paused=false. The CDP main-frame loader ID remained unchanged between the processing and playing states. Clicking Pause left it at 11.983322 seconds with paused=true. Project, Videos collection and selected asset remained unchanged.

Ignored in-app Browser evidence: `output/playwright/iab-processing.jpg`, `iab-ready-playing.jpg`, `iab-proof.json`. The Browser tab remains open as a user-facing deliverable. The verification project now contains seven synthetic clips; none were published. The misleading codec message while processing remains V1S-136's scope.

For future releases, use the confirmed `https://review-room.v1su4.dev` App VM target. V1S-134's earlier Vercel reproduction is historical; repository policy prohibits Vercel deployment. This branch requires both the new Convex `personal.processing` query and the Svelte frontend; Trigger code is unchanged. Deploy Convex before the frontend. An old backend leaves observation in recoverable retry rather than clearing the workspace.

On the confirmed deployment, upload a real video, open its queued/running review and keep the page open. Confirm the ready badge, thumbnail, actual playback and unchanged project/folder/selection. Repeat while switching assets and while a job is retried. Record the deployment revisions and observed result before marking Done.

V1S-136 owns accurate waiting/error presentation; V1S-137 owns private delivery optimization. This branch leaves those slices open.
