# Local import destinations and image classification

Verified 2026-09-22. This is device-local frontend evidence, not live upload, storage, authorization or persistence evidence.

## Behavior and original contract

- Root/collection imports create or reuse a flat `YYYYMMDD` folder for the current project. The date uses the browser's current local calendar, not UTC or file modification time. Exact-title reuse and increasing project-local order follow `convex/videos.ts:51–87,107–140` and `src/components/upload/UploadDropzone.tsx:55–57`.
- Entering a real folder makes it the import destination. The compact Import options popover can select another existing folder or today's date folder; Add media still opens the file picker directly. Project/collection/status navigation resets the destination to the appropriate context.
- Image classification supports IMG, CTX and STB; videos retain VID in mixed batches. Imported assets appear in the destination explorer without auto-opening a viewer.
- Registration validates project access, explicit folder ownership and all IDs before changing state. The date-folder fallback is part of member import registration; manual folder management remains admin-only. Current `getProjectForAdmin` is a historical name: it allows authorized shared project members; `AdminGate` checks signed-in app-user availability without rejecting client roles. No backend permissions were changed.
- An all-unsupported selection returns before creating a folder. Errors are visible on the overview and explorer. Registration failure releases temporary object URLs; thumbnail work begins only after successful registration.

## Evidence

- Added a failing public folder-transition test for root date-folder import/reuse, then implemented it. Regression cases cover next day, explicit destination precedence, project isolation, rejected/empty batches and member import versus admin-only manual creation.
- `bun test`: 64 pass, 0 fail, 292 assertions. `bun run check`: 0 errors, 0 warnings. Production build passes; adapter-auto still reports no configured deployment target, which remains a release gate.
- Official Svelte autofixer: ImportOptions has no issues/suggestions; parent has no issues, with pre-existing selection-reconciliation/effect and DOM binding suggestions.
- Read-only integration review by a second agent found no date/classification/navigation/error-atomicity issue.
- IAB desktop: real Downloads video creates `20260922` with one asset. Returning to All media and importing a reference JPG as CTX reuses that folder, now two assets. A new manual Storyboards folder defaults as destination.
- IAB 390x844 touch emulation: Import options stays within viewport (272px wide, x=12), document scrollWidth equals innerWidth=390; trigger/selects are 44px high. Importing a JPG and video into Storyboards with STB selected displays STB for the image and VID for the video. Both assets remain in the explicit folder.
- After the final build, a Markdown file selected through the local chooser shows "Choose video or image files to import." on the overview, with no folder and zero assets. A subsequent real-video import clears the error, creates the date folder and opens the explorer. Temporary mobile overrides restored.

## Remaining scope

Live upload queue/progress/retry, reservation-generated immutable asset codes, worker derivative handoff, storage and reload persistence remain unverified integration work. Folder covers, custom collections, project administration and measured playback performance remain independent frontend work. Goal stays active.
