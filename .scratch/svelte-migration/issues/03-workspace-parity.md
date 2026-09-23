# 03 — Port workspace browsing and organization

Status: ready-for-agent
Type: task
Blocked by: 02

## Scope

Port projects, folders, collections, filters, smart views, grid/group/table/review layouts, selection, preferences and role-aware controls in small complete slices. Use the approved visual direction.

## Acceptance

All applicable parity ledger rows pass on desktop and mobile; no hover-only action or accidental page overflow.

## References

[Migration spec](../spec.md)

## Comments

Implementation in progress. Workspace controls and local review/metadata slices are recorded in [workspace-metadata-evidence.md](../workspace-metadata-evidence.md). This ticket remains open until its full parity and live acceptance scope passes.

Local flat folder organization and archive/restore are verified in [folders-transport-evidence.md](../folders-transport-evidence.md). Cover controls, date-folder fallback, custom collections and project administration are still open.

Date-folder fallback and import destination/classification are locally implemented and verified in [import-destinations-evidence.md](../import-destinations-evidence.md). The date-folder item above is closed for local behavior; live ingest/reservation acceptance remains open under 06/07.

Cover controls and automatic image/video-poster fallback are locally verified in [folder-covers-evidence.md](../folder-covers-evidence.md). Folder drag/drop, custom collections and project administration remain open; live cover storage/authorization belong to integration acceptance.

Custom collection management and saved rules are locally verified in [collections-evidence.md](../collections-evidence.md). Live persistence and authorization remain open; folder drag/drop and project administration are next independent parity work.

Inline grid/list status editing and compact review action alignment are verified in [card-status-evidence.md](../card-status-evidence.md), including keyboard focus, field visibility and mobile touch targets. Remaining parity and live gates above remain open.

Folder drag/drop is locally verified in [folder-drag-evidence.md](../folder-drag-evidence.md), with group selection, root targets, preserved active review and mobile Move fallback. Project administration and full live acceptance remain open.

Project identity settings are locally verified in [project-identity-evidence.md](../project-identity-evidence.md). Name/client/description/accent/banner and compact desktop/mobile controls are implemented. Owner-only access management, membership, project archive and server persistence remain open.

Project-specific field visibility/order and shared display settings are locally verified in [appearance-preferences-evidence.md](../appearance-preferences-evidence.md), including legacy migration, project switching, reload and preserving a real-media playhead/draft. Authenticated per-user persistence remains open.

Owner/admin project archive and restore are locally verified in [project-archive-evidence.md](../project-archive-evidence.md), including last-project, searchable restore, retained real media/feedback/drafts and mobile drawer flow. Live ownership, persistent archive state and share-token scope remain unverified; access management and membership remain open.

Restored left/right asset keyboard navigation in visible order, including grid/table entry, boundary behavior and draft retention. Verified that text editing, timeline/pane controls and overlay focus retain their own keys; see [keyboard-navigation-evidence.md](../keyboard-navigation-evidence.md). Full accessibility matrix remains open.

Project access frontend is locally verified in [project-access-evidence.md](../project-access-evidence.md): visibility, members, email/domain rules, editor/viewer roles, owner-only management, confirmed saves and failure/cancellation recovery. The real workspace reports unavailable access management until backend integration resumes; live authorization and persistence remain open.
