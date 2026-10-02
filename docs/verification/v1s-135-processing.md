# V1S-135 — same-page processing completion

Branch: `codex/v1s-135-processing-completion`. Part of V1S-135; release acceptance is pending.

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

Local transport fixtures do not prove live authorization, uploads, persistence or Trigger integration. V1S-135 stays In Progress until the real journey passes.

Before releasing, confirm the frontend target. V1S-134 records a reproduction on Vercel, whereas repository policy and ADR 001 designate `https://review-room.v1su4.dev` on App VM and prohibit Vercel deployment. This branch requires both the new Convex `personal.processing` query and the Svelte frontend; Trigger code is unchanged. Deploy Convex before the frontend. An old backend leaves observation in recoverable retry rather than clearing the workspace.

On the confirmed deployment, upload a real video, open its queued/running review and keep the page open. Confirm the ready badge, thumbnail, actual playback and unchanged project/folder/selection. Repeat while switching assets and while a job is retried. Record the deployment revisions and observed result before marking Done.

V1S-136 owns accurate waiting/error presentation; V1S-137 owns private delivery optimization. This branch leaves those slices open.
