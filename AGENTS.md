# review-room — Agent Guide

Client-facing media review portal (working title: **Review Room**). Application code now lives in this repo; treat the docs below as product guidance and update the doc that owns a decision when behavior changes.

## Shared setup

For cross-tool conventions (secrets, durable memory, platform adapters), also read:

- `C:\Users\Gordo\Documents\Github\agent-home\AGENTS.md`

Local repo rules in this file take precedence for project-specific work.

## Read first

In order, before proposing product or UI changes:

1. [`init-docs/00-Creative-Brief.md`](init-docs/00-Creative-Brief.md) — vision, references, tone
2. [`init-docs/01-PRD.md`](init-docs/01-PRD.md) — scope, data model, logic, build order
3. [`init-docs/02-Design-Spec.md`](init-docs/02-Design-Spec.md) — screens, components, visual system

Do not duplicate facts across docs; update the doc that owns the topic.

## Working assumptions

- **Not a video editor** — no timeline, compositing, color tools, or transcoding pipeline in MVP.
- **Feel** — calm, editorial, cinematic, dark. Video is the hero; UI stays restrained.
- **Roles** — admin/creator vs client/reviewer (see PRD §1 and §9). Clients may review/comment/upload in the signed-in dashboard when shared; folder management, archive, and destructive production controls remain admin-only.
- **MVP focus** — upload, review playback, ratings, shortlist, comments, smart views, table view, feedback Inbox, share links.

## Commands

```bash
bun install
bun dev                    # Next.js (port 3000)
bunx convex dev            # local Convex OR homelab via .env.local
bun run deploy:convex      # self-hosted: CONVEX_SELF_HOSTED_* set
bun run worker:media       # ffmpeg thumbnail/sprite worker
```

Homelab env: copy from pindeck with `scripts/use-homelab-env.ps1`, then add `S3_*` from `.env.example`.

## Architecture

- `src/app/` — Next.js App Router (`/dashboard`, `/review/[token]`, storage API routes)
- `convex/` — schema, auth, CRUD, public review mutations, HTTP worker callback
- `src/components/` — UI by domain (`video/`, `project/`, `comments/`, `upload/`)
- `src/lib/storage/` — S3 presign (RustFS path-style)
- `services/media-worker/` — homelab ffmpeg jobs
- `docs/adr/` — infrastructure decisions

## Conventions

- Metadata in Convex only; blobs in RustFS (keys on `videos`)
- Smart views = queries over `status` + facets (see PRD §4–5)
- Asset class drives media behavior: only `VID` / `video/*` assets get video playback controls; `IMG`, `CTX`, and `STB` render as still-image review assets.
- Project folders are one-level real folders; date folders stay flat. Videos/Images/Contact Sheets/Storyboards are smart metadata collections, not nested folders.
- Folder create/rename/move/cover, archive, and destructive production controls are admin-only in UI and Convex mutations. Media upload is available to signed-in project members (admin and client).
- Brand color on banner/CTA only; status pills use semantic tokens
- Self-hosted Convex/RustFS per `docs/adr/001-infrastructure.md` (pindeck reference)

## Git

- Default branch: `main`
- Keep commits focused; do not commit secrets (`.env`, credentials, presigned URLs).
