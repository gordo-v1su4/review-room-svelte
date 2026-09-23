# Remaining work — 2026-09-22

This is a navigation list, not a replacement for the migration specification or acceptance ledger. The goal remains active; local fixture evidence does not prove live integration.

- [ ] Complete frontend parity: public-review/share screens; full original-vs-Svelte capability audit, including notification and account/project access flows.
- [ ] Complete UI polish: compact controls, alignment, responsive pane/drawer behavior, metadata/card/folder consistency; verify desktop and mobile with real media.
- [ ] Complete playback acceptance: hover scrubbing, frame stepping, sequential playback, native/WebCodecs/WebGPU fallbacks; measure latency and drops across the supported browser matrix.
- [ ] Complete accessibility acceptance: keyboard-only review, dialogs/focus return, contrast, reduced motion and touch targets.
- [ ] Resume backend work when authorized: live sign-in, role enforcement, durable persistence, uploads/downloads and notifications. Resolve the concrete [public-review authorization findings](public-review-access-audit.md) before exposing shared review.
- [ ] Release: full live end-to-end flows, deployment configuration and verified deployment; the old Next.js app has been removed at the user's request; use Git commit `301495d` for unfinished parity comparison. Never push to Buzero.

## Next tasks, in order

1. Connect and verify the implemented share administration after backend work resumes; finish remaining public-review parity. The shared viewer now has local real-media acceptance; remote-source metadata and payload-refresh reconciliation remain required integration checks.
2. Audit original-vs-Svelte feature parity, especially share management, notifications, account/project access and role-specific controls.
3. Finish visual polish: compact project-settings controls, header alignment, restrained surfaces, consistent folders/cards/status colors, and responsive panes/drawers. Re-check existing fixes rather than assuming they remain broken.
4. Complete playback acceptance across supported browsers: hover scrubbing, frame stepping, sequence playback, codec/GPU fallbacks, latency and dropped frames.
5. Complete keyboard, focus, contrast, reduced-motion and mobile touch-target acceptance.
6. When backend work resumes: resolve public-review authorization findings; prove sign-in, permissions, durable saves, uploads, downloads and notifications against live services.
7. Run full live end-to-end acceptance and verify deployment. The original frontend is retained in Git history at `301495d`, not as a second runnable app.

Shared-review local acceptance is recorded in [shared-review-viewer-evidence.md](shared-review-viewer-evidence.md): 120 suite tests, desktop/mobile real-media scenarios and production fixture exclusion. Live integration is still unverified.

Recent completed slices: [shortlist sequence playback](shortlist-preview-evidence.md), [asset keyboard navigation](keyboard-navigation-evidence.md), [mobile metadata sheet](mobile-metadata-evidence.md), and [shared-review access gates](public-review-gate-evidence.md).

Source tickets: [03](issues/03-workspace-parity.md), [04](issues/04-review-feedback-sharing.md), [07](issues/07-integration-cutover.md). Ticket filenames and spec remain authoritative where this index is less detailed.

Personal frontend deployment is READY at https://review-room-svelte.vercel.app. Root cleanup, project editing/color and hosted playback evidence: [root-cleanup-deployment-evidence.md](root-cleanup-deployment-evidence.md). Live persistence and release gates above remain open.

Compact toolbar, borderless cards, direct ratings and local share-administration acceptance: [compact-controls-share-evidence.md](compact-controls-share-evidence.md).

Header notification preview and inbox handoff are locally verified in [notification shortcut acceptance](notification-shortcut-evidence.md). Live delivery/persistence and account/project-access parity remain open.
