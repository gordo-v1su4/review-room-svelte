# Project access — frontend acceptance, 2026-09-22

## Scope and contract

Restored the project access dialog: private/shared/workspace visibility, direct members, email/domain rules, editor/viewer roles, and removal. The existing owner cannot be removed. Management requires server-confirmed admin-and-owner authorization; authorized nonowners receive a read-only list. Historical comparison: `301495d:src/components/project/ProjectWorkspace.tsx` ProjectAccessPopover; current backend contract: `convex/projects.ts` listMembers, setVisibility, addMember, removeMember and removeAccessRule.

The state controller applies only confirmed gateway snapshots, validates project scope, prevents duplicate writes, preserves confirmed state after failures and ignores stale requests after a project switch or disposal. No backend was contacted or changed. The workspace uses the unavailable gateway until backend integration resumes.

## Verification

- `bun run check`: zero errors/warnings. `bun run build`: passes.
- Twelve domain tests cover authorization, confirmation, failed-save recovery, invalid entries/actions, stale results, cancellation and unavailable service.
- Local browser fixture: owner visibility changes, adding a domain rule and named member, role selection, removal, workspace visibility retained on add, and retry after failed load/save. Owner entries have no removal action; nonowner entries have no editing controls.
- Cancelled a held save with Escape: pending count returned from one to zero, focus returned to the trigger, and reopening showed the original private project and two people. Denied access exposes no member list or edit form.
- At 390×844 with coarse pointer: bottom sheet is 390px wide, no page overflow, all dialog buttons are 44px tall. Typed input remains visibly present after resizing; closing returns focus. Main workspace toolbar also has no horizontal page overflow at this size.
- Fresh fixture browser console: no errors or warnings. Root workspace displays the unavailable-service explanation without edit controls.

## Remaining acceptance

This is fixture and frontend evidence only. Live sign-in, authorization, identity/rule matching, visibility semantics, immediate permission changes, persistent membership and reload behavior still require the authorized backend integration.

Production verification: commit `477f425` deployed READY to the personal Vercel production alias. Browser verified unavailable-service state, no mutation controls, Escape focus return and no console warnings/errors. `/dev/project-access` returned HTTP 404.
