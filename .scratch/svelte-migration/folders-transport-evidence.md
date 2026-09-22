# Folder organization and compact transport — 2026-09-22

Status: local session verified; live integration and full parity remain open.

## Folder organization

`project-folders.ts` owns flat real folders separately from smart Videos/Images/Shortlist collections. The tree and overview expose new folders; folder navigation opens the explorer. Current-folder imports register the destination. Create, rename, multi-asset move, folder removal with move-to-root or archive disposition, and restoration are wired through permission-aware transitions. Admin+editable-project permission is required for organization; member import is separate. Bulk operations validate the whole set before returning a new state and reject foreign-project assets/destinations. Existing backend allows duplicate titles on create but rejects duplicate sibling names on rename; the module matches this.

Archive placement is presented as the original `archived` status while retaining the previous review state locally for restoration. The Archived tree view and the status filter both find these assets. Selecting Archived alongside other status filters searches both active and archived project assets. All media receives its own active tree styling. Project and folder counts exclude archived assets from active totals.

Browser flows with real local Downloads media verified:
- Create Rushes; import one image and one video directly into it; tree count 2 and mixed explorer count 2.
- Rename to Selected takes; move the image to project root; folder count becomes 1 and only video remains.
- Delete folder with Archive assets; Archived count becomes 1; restore returns video to root and removes empty archive tree entry.
- Subsequent final integration test: create Studio takes, import real video, enter a comment draft, archive via folder deletion, find it via Archived status filter, restore via Archived view. Reopening video retains exact draft `Keep this camera move.`
- Module tests cover member/admin guards, foreign-project rejection, atomic batches, identity/name validation, archive/restore and cover ownership.

Cover controls, date-folder ingest fallback, project metadata/members and custom smart collections remain separate unfinished parity work. The domain cover operation is implemented but is not claimed as a completed UI feature. Folder persistence is tab-local only.

## Requested player treatment

Play control is 36×28 CSS px on desktop with previous/next frame controls adjacent. Time readout toggles elapsed/duration to frame position/count plus detected approximate FPS, retaining fixed width. Rectangular seek thumb unchanged. Coarse-pointer targets are 44px high (play48px wide); controls wrap on narrow viewports.

Stepping uses the detected source average frame rate and pauses playback. It is disabled if no rate is detected. Variable-rate media remains approximate; this is not a claim of demuxed per-frame timestamp navigation. `cancelScrub()` restores mute without resuming and retains the attachment-owned session, so subsequent seeks, scrubs and source disposal remain valid. Display tolerance of1µs handles native timestamp truncation without changing seek targets.

Final browser acceptance on `camera_rotating_around_rapper_in_music_video_a51538.mp4` (1360×752,H.264,approximately24fps):
- Next frame from zero: currentTime0.041666, pausedtrue, readout `1 / 208 · ≈24 fps`.
- Previous frame: currentTime0, readout `0 / 208 · ≈24 fps`.
- Toggling returns to time display. Pressing Next frame during playback pauses at the next step.
-390×844 viewport with coarse touch emulation: document scrollWidth390; transport fits326px and wraps into91px; every transport button44px high. Mobile Next frame works.
- Temporary device/touch overrides cleared. Live local tab retained with real video.

## Validation

`bun run check`: zero errors/warnings. `bun test`:62passed,277assertions. `bun run build`:pass. Official Svelte autofixer reports no issues; suggestions concern intentionally reassigned Set state, existing filtered-selection reconciliation and DOM media attachments.

Read-only review caught the archive filter mismatch, fixed and reproduced through UI. Playback review caught session-ownership replacement during scrub and native frame-counter rounding; both corrected with red→green regression tests and final browser checks.

Production adapter selection, live auth/permissions, upload/download, persistence, share routes and named-device latency benchmarks remain required shipping gates. Backend repair is still deferred. No upstream push or deployment occurred.
