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
