# unfolding-review — Agent Guide

Planning repo for a client-facing video review portal (working title: **Review Room**). Application code has not started yet; treat the docs below as the current source of truth.

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
- **Roles** — admin/creator vs client/reviewer (see PRD §1).
- **MVP focus** — upload, review playback, ratings, shortlist, comments, smart views, share links.

## When code lands

Fill in these sections as the stack and layout are chosen:

```markdown
## Commands
<!-- e.g. bun dev, bun test -->

## Architecture
<!-- app layout, key folders -->

## Conventions
<!-- naming, state, API patterns -->
```

Until then, do not invent stack choices beyond what the PRD implies.

## Git

- Default branch: `main`
- Keep commits focused; do not commit secrets (`.env`, credentials, presigned URLs).
