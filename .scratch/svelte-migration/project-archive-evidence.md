# Project archive and restore — 2026-09-22

Restored the original owner/admin archive and unarchive contract locally. Archiving removes the project from active navigation, editing access and feedback digests; media, folder placements, reviews, drafts, identity and object URLs remain retained. Restore returns the same project and records. The last archived project shows Restore/New project actions instead of an unusable workspace.

Project settings has a compact two-step archive confirmation. A searchable Archived projects dialog restores projects from desktop navigation or the mobile drawer. No permanent delete operation was added.

Pending local imports are cancelled on archive; the commit path also checks current project access. Pending identity and folder-cover request tokens are invalidated so a late decode cannot overwrite metadata after archive/restore. The folder-cover race was found in independent review and fixed.

## Evidence

- Domain tests cover admin-owner archive/restore, identity preservation, idempotence, non-admin/editor/unrelated-owner denial and rejecting identity edits while archived. Targeted identity/inbox/import queue suites: 13 pass, 67 assertions.
- Direct svelte-check: zero errors/warnings. Both new/changed dialogs compile without warnings.
- Isolated localhost browser imported the actual Downloads H.264 MP4, published a timecoded note and left an unsent draft. Keep project cancelled the confirmation without mutation. Confirm archive removed the last active project, hid editing/upload tools and reduced inbox open count from 1 to 0.
- Archived-project search showed No matching projects and Clear search. Restore returned the same date folder and video; published note, unsent draft and inbox count 1 were preserved.
- At 390×844, archive confirmation targets measured 44px. Restoring through the mobile navigation drawer and archive sheet succeeded, closed navigation and returned the project overview. Sheet width 390, document scroll width 390, restore target 44px. Device/touch overrides cleared.
- Final desktop archive dialog visually inspected; Restore measures 28px. Last-project navigation copy is No active projects.

## Remaining gates

All changes remain session-local. This does not establish live ownership, persistent archive state, share-token revocation or remote storage behavior. Live access management, membership, authentication, persistence and deployment remain required shipping gates. Slow cover/import completion protection has code/domain evidence; native browser interruption during decoding remains unverified.
