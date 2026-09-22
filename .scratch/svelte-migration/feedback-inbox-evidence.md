# Feedback inbox — local acceptance, 2026-09-22

Restores the original inbox's project/UTC-day grouping in a compact searchable Svelte dialog. The sidebar count represents open notes, not unread notifications. All/open filters, handle/reopen, author role and source time links use the same review state as the inspector. Publishing retains author and timestamp. Local notes lacking timestamps are grouped as Undated rather than assigned a fabricated date.

The projection excludes archived projects/assets and projects outside the provided admin access scope. These are local presentation checks; live server authorization remains required. The original `convex/inbox.ts` additionally folds legacy `feedbackAcknowledgedAt` into completion; the future live adapter must retain that normalization.

## Verification

- Red/green at review and feedback seams: author/timestamp retention, project/day grouping with a midnight UTC boundary, exact asset/folder/zero-time identity, and exclusion of inaccessible/archived data. Review/session/playback targeted suites: 21 tests, 99 assertions pass.
- Direct `svelte-check`: zero errors and warnings. Independent read-only integration review found no material local issue.
- IAB with the user's real `camera_rotating_around_rapper_in_music_video_a51538.mp4`: created a note at 1.00s and a separate unsent draft. Inbox showed project/date/author/body/time and one open note.
- Handle removed the note from Open and reduced count to zero. Show all exposed it; Reopen restored count to one. No approval mutation.
- Closing the viewer and following the inbox link restored folder `20260922`, video at exactly 1s, inspector notes and unsent draft.
- Created Second project, searched for a nonmatching phrase (empty state), then followed the original note. Correct Studio project/folder, 1s playhead and draft restored.
- Mobile 390×844 touch: nested navigation drawer to inbox worked; sheet x=0..390, page scrollWidth=390, all actions 44px. Opening a note closed overlays and restored 1s/draft with no horizontal overflow. Device/touch overrides cleared immediately after the scenario.
- Final readiness adjustment: Player.seek reports whether it applied; pending inbox seeks survive an unready player. Re-imported real clip and repeated close-viewer/inbox-open against final code: exactly 1s.
- Desktop visual inspection: compact 28px controls, subdued dark surface, restrained teal time links. Temporary QA tab closed.

## Remaining gates

This is tab-local review. Live inbox queries, notification delivery, durable route links, author identity, access revocation and persistence remain open alongside public review/sharing and other backend acceptance.
