# Creative Brief — Video Review App

**Working title:** *Review Room* (placeholder)
**Owner:** Gonzalez · **Status:** v1, ready for handoff · **Date:** June 2, 2026

---

## The document set

Read in this order. Each fact lives in one place; the others point here rather than repeat.

1. **Creative Brief** (this doc) — vision, references, tone. The "why and feel."
2. **PRD** (`01-PRD.md`) — product + engineering source of truth: scope, data model, logic, storage, build order, acceptance criteria.
3. **Design Spec** (`02-Design-Spec.md`) — UI/UX source of truth: screens, views, components, and visual/token system.

---

## What it is

A clean, client-facing media review portal. The creator uploads many cuts and still images for a project; a client opens a polished link, watches or views quickly, then rates, shortlists, comments, and approves or requests changes. The app organizes itself around what the client does — media assets surface into the right groups automatically as their state changes.

It is **not** a video editor. No timeline, no compositing, no color tools, no transcoding pipeline. Pull *playback feel* from the editing references; pull nothing else.

## North star

> A premium media review room where every asset is easy to watch or inspect, sort, discuss, and approve.

Calm, editorial, cinematic, dark. The media is the only real color on screen; the interface is restrained neutral chrome that stays out of the way. It should feel finished enough to send straight to a paying client with no apology.

## The blend

- **Frame.io** — clarity of the review/playback loop; the asset is the hero.
- **ftrack** — production/status awareness, but heavily simplified.
- **Airtable interfaces** — multiple views of one dataset, filtering and grouping, *without* spreadsheet energy.
- **A high-end creative portfolio** — visual polish and presentation.

## What it must not feel like

A spreadsheet · a rigid drag-everything Kanban board · a task manager · a heavy editor · a generic SaaS/admin dashboard. (Stated once here; the other docs assume it.)

## Reference repos

Inspect for patterns and conventions — do not copy wholesale.

- **`gordo-v1su4/freecut`** — the playback/scrub and media-analysis feel to emulate: batch import that becomes browsable quickly, hover scrub over every clip, frame-accurate preview behavior, decoder prewarming, adaptive preview quality via native video / WebCodecs / WebGPU / Web Workers / OPFS, and browser-local scene captions. Lift the *review media module*, not the editor, timeline, compositing, export, or project-authoring machinery.
- **`gordo-v1su4/pindeck`** — clean, dense-but-simple layout direction; also the deploy pattern (Vercel frontend + prod Convex, separate always-on worker for any background processing).
- **`gordo-v1su4/project-stack-structure`** — preferred folder structure, naming, and stack conventions. Align to this.

## Visual one-liner

Dark mode first, black-and-white field built from **zinc or neutral** (never slate), layered dark surfaces for depth, accent color reserved for brand and a small fixed set of semantic states. Full token system in the Design Spec.
