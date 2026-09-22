# Shipping goal

Status: active

Deliver a predominantly Svelte 5 / SvelteKit / TypeScript Review Room with the approved charcoal/zinc/teal redesign, simplified interactions, smooth responsive behavior, mobile-first review, and measured low-latency playback and scrubbing. Preserve existing capabilities and permissions. Follow the installed Matt Pocock skills and the accepted decisions in [spec.md](spec.md).

## Execution order

1. Complete the parity ledger and record a real-media baseline using the approved test seams.
2. Build a complete Svelte review slice with a genuine playback surface and state-preserving responsive layout.
3. Expand workspace, feedback, sharing and upload parity through small tested slices.
4. Validate WebCodecs/WebGPU acceleration against native playback, including unsupported codecs and recovery paths.
5. Reconnect and verify live backend behavior when backend repair resumes; then finish release validation and deployment readiness.

Follow the dependency links in `issues/`; do not mark a ticket complete without its acceptance evidence.

## Required shipping evidence

- Every parity-ledger behavior verified for its relevant role and route.
- Mobile, desktop, short landscape and continuous resize exercised in a real browser; no loss of playhead, selection or comment draft.
- Keyboard/focus, touch targets, reduced motion, loading, empty, error and denied states verified.
- Named real-media/device measurements for first-frame time, seek response and dropped frames; native fallback verified.
- Live authentication, authorization, share scope, persistence, upload/download and derivative handling verified after reconnection.
- Production build and release configuration verified, with a documented cutover/rollback procedure and explicit deployment target.

## Constraints

Work only in `gordo-v1su4/review-room-svelte`. Never push to Buzero. Do not activate the archived upstream deployment workflow. Keep secrets excluded from Git. Backend connectivity repair remains deferred; frontend work proceeds independently, but fixture evidence cannot satisfy live shipping gates. A shippable state is required; public deployment is a separate action requiring an established destination and authorization.

## Current state

Tooling and personal repository setup complete. Design direction and test seams approved. The first Svelte workspace opens local video/images, preserves playback through responsive layout changes, and supports local review decisions and drafts. A source-backed parity ledger now tracks the remaining capabilities. Native playback and review-state tests pass; full parity, measured acceleration, live integration and shipping checks remain open. This document records the goal; it is not a completion report.

## Latest increment: explorer and studio workflow

See [explorer-studio-evidence.md](explorer-studio-evidence.md). Folder-only overview, explorer-first import, optional resizable viewer/notes, Appearance, lazy hover scrub, rectangular playheads, studio properties, MP4 worker/GPU previews/native fallback implemented and browser-checked with real Downloads media. 27 tests pass. Full parity and live release gates remain open; next local work is composable facets/grouping, remaining appearance fields, multiselection, full asset classes/inspector, and still review.

## Latest increment: workspace controls and metadata

See [workspace-metadata-evidence.md](workspace-metadata-evidence.md). Composable facets/grouping, field visibility/order, multiselection/batch review and tagging, and searchable typed metadata are implemented for local sessions and browser-checked. Dense cached hover previews also pass real-media browser checks; remaining independent work includes still-review/folder parity and playback benchmarks. Live shipping gates remain open.

## Latest increment: still review and viewed state

See [still-review-evidence.md](still-review-evidence.md). Four markup tools, per-asset draft/saved baselines, undo/clear, explicit local save, original download, fullscreen and viewed metadata are implemented. Real-image browser checks confirm draft isolation, normalized geometry and 390px/fullscreen preservation. 53 tests pass. Next independent work: real folder/project organization parity and measured playback performance. Live backend and release gates remain open.

## Latest increment: real folders and transport controls

See [folders-transport-evidence.md](folders-transport-evidence.md). Local real folders now support create, rename, scoped import, multi-asset moves, remove/archive and restore with retained review drafts. Player has compact controls, frame stepping and time/frame display; real-video desktop/mobile checks passed. 62 tests pass. Remaining independent work includes covers/date folders/custom collections, project administration, keyboard/a11y polish and measured native/accelerated performance; live integration and release gates remain open.

## Latest increment: import destinations and classification

See [import-destinations-evidence.md](import-destinations-evidence.md). Root imports now create/reuse the original browser-local date folder; real-folder context and optional destination selection take precedence. Compact import options restore image/contact-sheet/storyboard classification with unchanged video semantics. Desktop/mobile real-media checks and rejected-file feedback pass; 64 tests pass. Cover controls, remaining organization/admin parity, measured playback and live release gates remain open.

## Latest increment: folder covers

See [folder-covers-evidence.md](folder-covers-evidence.md). Local custom cover selection/reset and original automatic image/video-poster fallback are restored, with bounded image previews and URL cleanup. Desktop/mobile real-file checks include corrupt-image recovery and corrected Escape focus restoration. 66 tests pass. Remaining organization/admin, performance, accessibility and live release gates keep this goal active.

## Latest increment: custom collections

See [collections-evidence.md](collections-evidence.md). Local saved filter/source-folder views, dynamic tree counts, rename/delete and keyboard/mobile controls are implemented and verified. 72 tests pass. Live persistence/authorization, remaining organization/admin, performance and release gates remain open.

## Latest increment: inline card status

See [card-status-evidence.md](card-status-evidence.md). Cards support permission-aware status editing; review actions are compact and left/right aligned. Real-video desktop/mobile, keyboard and Appearance visibility checks pass; 18 targeted tests pass. The overall goal remains active with the existing parity and live release gates.
