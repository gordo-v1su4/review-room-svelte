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
bun dev                    # SvelteKit (http://127.0.0.1:5173)
bun run check
bun test
bun run build
bunx convex dev            # local Convex OR homelab via .env.local
bun run deploy:convex      # self-hosted: CONVEX_SELF_HOSTED_* set
bun run worker:media       # ffmpeg thumbnail/sprite worker
```

Homelab env: start from `.env.example` and populate only this app's dedicated Review Room Convex, Trigger, and scoped RustFS credentials. Never copy another project's environment or credentials.

## Deployment invariant

- Personal GitHub repository `gordo-v1su4/review-room-svelte` is the source of the standalone app. The production frontend runs on App VM at `https://review.v1su4.dev` using `infra/app-vm/compose.yaml`; deploys are explicit until a dedicated workflow is verified.
- Never deploy to the former React app, Hostinger, Buzero, or Vercel. Frontend and Convex deployments are separate surfaces; verify each touched surface.

## Architecture

- `src/routes/` — SvelteKit workspace and token-scoped review routes
- `convex/` — schema, auth, CRUD, public review mutations, HTTP worker callback
- `src/lib/` — typed domain modules, media adapters, and Svelte components
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
- Do not call a production fix complete until every touched deployment surface is deployed and verified.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->

## Agent skills

### Issue tracker

Specs and tickets live in local Markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default Matt Pocock triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` and the existing `docs/adr/`. See `docs/agents/domain.md`.

## Ownership and migration

- Work in `gordo-v1su4/review-room-svelte`, local directory `/Users/robertspaniolo/Documents/Github/review-room-svelte`. This is the standalone app checkout; do not work from the old `Documents/ChatGPT/review-room-black` container.
- NEVER push to Buzero or Buzero-IO GitHub repositories. The Buzero remote has been removed. Only the personal `origin` remains.
- Buzero disables forks; this is an independent private repository preserving the original Git history.
- Migration specification: `.scratch/svelte-migration/spec.md`; numbered local issues in that directory's `issues/` folder.
- Backend connectivity repair is deferred. Fixture-mode UI evidence is not proof of live persistence or authorization.
- Apply the installed Matt Pocock `codebase-design` and `tdd` disciplines. Agree test seams before writing tests; implement one observable behavior at a time and review against standards and the spec.
