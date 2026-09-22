# Shortlist sequence playback — 2026-09-22

## Implemented

- Preview shortlist plays a stable snapshot of the current project's nonarchived shortlisted assets. Native videos advance on ended; loaded stills display for 2.5 seconds. Loop supports mixed media and single clips.
- Stop pauses playback and cancels still timers. Explicit media/folder/project navigation stops the sequence. Removed/unshortlisted items are skipped; new selections join the next run.
- The existing persistent player, review session and per-asset drafts are reused. Markup input is hidden during timed still preview to avoid advancing during drawing.
- Readiness is retained when starting/restarting the already-open first item. Source-checked media failures and blocked autoplay stop the sequence with recovery feedback.
- Desktop controls are 28px; coarse-pointer controls are 44px. No new animation or frame polling.

## Evidence

- Started with a failing playback-seam test for missing sequence implementation; implemented ordered advance/finish, then covered looping, removals, empty queues and stable snapshots.
- `bun test src/lib/playback/session.test.ts src/lib/playback/shortlist-preview.test.ts`: 7 pass, 33 assertions.
- `bunx svelte-check --tsconfig ./tsconfig.json`: 0 errors, 0 warnings. No sync/build used during browser sessions.
- Independent source review found same-source readiness loss; fixed, then browser verified preview starts on an already-open single clip. Single-clip loop remained playing after the first duration; Stop yielded paused native video at its current position.
- Isolated IAB tab 15 imported real Downloads H.264 MP4 (1360×752, 8.666667s) and JPG (1200×900). Image advanced to playing video; non-loop run finished at 8.666667 with Preview shortlist/Play restored. Restart repeated the sequence.
- Final-code mixed run with loop: image → video, then resized to 390px while playing. Native video remained unpaused at 0.133624; existing draft `Preserve through responsive preview.` and original 8.67s pin remained. Document scroll width matched viewport390; Stop and Loop targets measured44px. Stop paused at6.873983; desktop restore measured28px. Temporary viewport/touch overrides removed.

## Limits

Local media and in-tab review only. This does not prove remote playback, live persistence or public-token access. Browser autoplay-denial and media-error callbacks were source reviewed/typechecked; no artificial DOM event was used to claim a native decoder failure. The supported-browser performance/accessibility matrix remains open.
