# Custom collections — local parity evidence

Date: 2026-09-22. Scope: Svelte device-local workspace. Live persistence and authorization are not proven by this evidence.

## Implemented

- User collections create, rename, delete and save current explorer filter rules with an optional project source folder. Definitions and queries remain separate from media placement; deletion cannot delete media.
- Definitions snapshot search, tags, statuses, classes, shortlist, rating, comments, sort/group and media type. Tree counts re-evaluate saved definitions against current metadata. Opening a collection restores its saved criteria; unsaved browsing edits do not overwrite them.
- New collections stay empty until configured. Saving without a source folder or meaningful filter gives an actionable error. Folder scope AND filter rules apply together. Missing source folders stay constrained and display an explicit recovery message.
- Collection transition permissions mirror getProjectForEditor: owner/editor access; viewer and unrelated project roles rejected. The local page has an explicit local-owner adapter. Live calls still require backend checks.
- Compact Bits dialogs support errors, keyboard focus return, and 44px touch controls. Collection header now grows/wraps instead of clipping controls in its former fixed 42px height.

## Evidence

- Bun: 72 tests pass, 342 assertions; Svelte check 0 errors/0 warnings; production build passes. Final CSS-only header adjustment was browser verified after those checks.
- Domain tests cover creation/access, immutable snapshots, empty-save rejection, cross-project source rejection, folder AND filters, dynamic metadata/status/move membership, archive opt-in, deletion without media mutation.
- Real local Downloads video plus reference JPG: new Review queue starts empty; empty rules rejected; source 20260922 yields 2 assets. Saved awaiting-review + video rules yield 1. Leaving/reopening restores that result. Approving the video changes saved count to 0 immediately while viewer retains the clip.
- At 390x844 with touch emulation, rename succeeds, focus returns to the renamed collection settings trigger. Header 57px contains 44px actions; document width and scroll width both 390. Dialog measured 362px wide with 14px side margins and 44px action.
- Separate background QA tab: delete returns to All media and focuses New collection; a real imported video remains present (Media 1). Overrides cleared and QA tab closed. User workspace left intact.
- Read-only integration review found no correctness issue; flagged fixed-height header risk, resolved with flexible height and wrapping.

## Remaining gates

Live collection storage/serialization, server permissions, and rehydration remain integration work. System collection provisioning stays in the existing backend. Folder drag/drop, project administration, broader accessibility/performance and release gates remain open.
