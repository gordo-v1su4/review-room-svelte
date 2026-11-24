# Phone navigation refresh

Status: verified locally; draft PR, awaiting user UI approval

Current delivery and acceptance checklist: `plan.md`.

Approved in this chat on 2026-11-24. Canonical visual decisions live in
`init-docs/02-Design-Spec.md` section 15; this file is the review and verification scope.

## Scope

- Retain the approved navigation drawer, including its independently approved shared footer changes.
- Apply the new browsing/review/panel arrangement only at viewport widths up to 640px.
- Keep all wider desktop and intermediate layouts as they were before this refresh.
- User-requested exceptions: a 300px desktop sidebar, uniform compact browsing controls and folder hover/color treatment, and shared Notes & info dropdown styling/content described below.
- Preserve role checks, selected versions, feedback drafts, canonical media and existing operations.
- Verify vertical folder browsing, media filters and wrapped breadcrumbs without sideways scrolling.
- Verify dedicated review with Menu and Back to folder available, plus Media and Notes & info sections.
- Verify secondary project, folder, account and publishing controls through Tools.
- Verify inset dialogs, reachable close controls, and publishing's Section chooser with scrolling body.
- Verify expandable phone table rows and retain the wider table.

## Delivery

### Notes & info dropdown follow-up (2026-11-24)

Replace native selects throughout Asset metadata with the existing dark themed
dropdowns: completeness, asset class, model, custom-field type/boolean, image grid
and multiple reference images. This shared correction applies on desktop and phone
without rearranging the desktop inspector. Asset class lists Video, Image, Contact
sheet and Storyboard, with incompatible source-file families disabled rather than
silently relabelling a still image as a video or vice versa. Add the user's requested image-model labels GPT Imagen 2.6,
Nano Banana Pro, Nano Banana 2.1 and Seedream 5.0; retain existing video presets,
unknown saved model values and Custom model. These are workspace labels supplied by
the user, not claims about vendor model availability. Preserve metadata save and
read-only behavior. Verify selection, keyboard close/focus and bounded menus.

### Existing delivery sequence

Use the current branch. Run the repository checks and browser verification, review
against main on Standards, Spec and bug-focused axes, address scoped defects, and
open a PR to main with results and a useful navigation diagram. Run the installed
retro skill after the PR. Merging and deployment are separate actions.

The existing local dev examples verify UI arrangement and navigation only. They
contain synthetic asset IDs and do not prove real media playback, persistence or
production authorization.
