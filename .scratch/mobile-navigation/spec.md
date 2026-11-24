# Phone navigation refresh

Status: verified locally; ready for pull request review

Approved in this chat on 2026-11-24. Canonical visual decisions live in
`init-docs/02-Design-Spec.md` section 15; this file is the review and verification scope.

## Scope

- Retain the approved navigation drawer, including its independently approved shared footer changes.
- Apply the new browsing/review/panel arrangement only at viewport widths up to 640px.
- Keep all wider desktop and intermediate layouts as they were before this refresh.
- Preserve role checks, selected versions, feedback drafts, canonical media and existing operations.
- Verify vertical folder browsing, media filters and wrapped breadcrumbs without sideways scrolling.
- Verify dedicated review with Menu and Back to folder available, plus Media and Notes & info sections.
- Verify secondary project, folder, account and publishing controls through Tools.
- Verify inset dialogs, reachable close controls, and publishing's Section chooser with scrolling body.
- Verify expandable phone table rows and retain the wider table.

## Delivery

Use the current branch. Run the repository checks and browser verification, review
against main on Standards, Spec and bug-focused axes, address scoped defects, and
open a PR to main with results and a useful navigation diagram. Run the installed
retro skill after the PR. Merging and deployment are separate actions.

The existing local dev examples verify UI arrangement and navigation only. They
contain synthetic asset IDs and do not prove real media playback, persistence or
production authorization.
