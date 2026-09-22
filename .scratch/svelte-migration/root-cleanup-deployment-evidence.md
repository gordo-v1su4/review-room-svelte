# Root cleanup and personal deployment — 2026-09-22

The user explicitly requested removal of the old app and duplicate Git, lock and configuration files. This advances source retirement ahead of the original live-parity gate; it does not satisfy that gate.

## Changes

- SvelteKit now owns root `src/`, `package.json`, `bun.lock`, TypeScript/Vite/Svelte/Vercel configuration. Three shared helpers were retained; no imports reach into a second app.
- Removed the old Next.js source, public logo, startup scripts, build output, dependencies, inherited GitHub template and archived upstream deployment files.
- Removed the Buzero remote. The personal origin remains `gordo-v1su4/review-room-svelte`.
- Empty outer repository metadata and duplicate Graft cache moved to macOS Trash (`review-room-empty-wrapper-20260922-193923`). The real repository and current Graft configuration remain intact.
- Backend/worker sources, secrets, product docs and current skills remain for deferred integration. Original feature inventory is recoverable from Git commit `301495d`.
- Project tree has a compact New project action and permission-gated Edit action; double-click opens project name editing. Brand color now affects the primary action and optional banner while semantic status colors remain separate.

## Acceptance

- Root `bun run check`: zero errors/warnings. `bun test`: 120 passing tests, 597 assertions. `bun run build`: passed.
- Local browser: create a second project with the three starter collections; edit/rename the first from its tree action and double-click while another project is selected; retained saved purple `#7e14b8`, selected name input, focus returned to Edit after saving.
- Hosted browser: edited project name and purple brand color; computed Add media gradient changes to purple and desktop height remains 28px.
- Hosted real H.264 video: local import into a date folder, explorer card opens viewer; source 1280×720, approximately 24fps, 16 seconds; Play advances currentTime with readyState 4, unpaused and no media error.
- Deployment dry run: 75 source/config files, no `.env.local`, Git metadata, user media, backend sources or tests uploaded.
- Personal Vercel owner `gordo-v1su4s-projects`, project `review-room-svelte`, deployment `dpl_J5bCNY57PDTL1m4CgPXwdKubLhbi`: READY, production alias https://review-room-svelte.vercel.app.
- Hosted `/` 200; `/dev/shared-review` and `/dev/review-access` 404. Token review has private/no-store, no-referrer, noindex/nofollow headers and remains unconfigured/fail-closed.

Live backend integration, durable persistence, full parity and cross-browser performance acceptance remain open. This release is the local-session frontend, not a connected production backend.
