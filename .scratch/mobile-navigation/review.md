# Phone refresh review

Reviewed initial implementation `d8e4eab` against fixed point
`c8800926f60ac393d067be00e1fe2fde6f73b86f` on independent axes.
Findings below describe that reviewed revision; resolutions are in subsequent commits.

## Standards

Two documented findings and one judgement call:

- **P2, conflicting canonical spec:** obsolete toolbar and fullscreen-dialog rules
  contradicted the approved phone screen. Resolved by rewriting the superseded
  bullets in Design Spec section 15.
- **P2, phone target size:** wrapped breadcrumb buttons were 36px high. Resolved to 44px.
- **Possible duplicated code:** folder loops and table status/rating controls appeared
  in both arrangements. Resolved with shared Svelte snippets, keeping distinct layouts.

## Spec

Two P2 findings:

- Drawer Edit project could address an unmounted settings dialog. Resolved by
  opening Tools before mounting and opening its controlled project settings dialog.
  Verified from the phone drawer at 320px.
- Hidden phone table buttons preceded wider table buttons, breaking desktop focus
  restoration. Resolved by rendering only the active table arrangement. Verified
  at 1280px: closing review restored focus to asset `par-0010`, with no phone rows mounted.

## Independent bug-focused review

The requested `review-bugbot` skill is installed locally. This Codex runtime does
not expose the dedicated Bugbot service/agent type; a general independent agent
performed an explicitly identified compatibility review. This is not a native
Bugbot service check or a GitHub approval.

| Severity | Location (reviewed revision) | Finding and resolution |
|---|---|---|
| P2 | src/routes/+page.svelte:1369 | Drawer settings mount issue; fixed and verified as above. |
| P2 | src/routes/+page.svelte:806 | Inbox navigation selected Media and could leave Tools covering the note. It now selects Notes, dismisses Tools and restores notes focus below the sticky header. Verified through Notifications → Inbox → note. |
| P2 | src/routes/+page.svelte:1369 | The publishing return address could not mount its dialog. Phone `sharing=1` now opens Tools so publishing mounts and opens; verified on a fresh address load. |
| P2 | src/app.css:2139 | Copy and misfiled panel headings were omitted from the sticky treatment. Both heading classes now share the phone panel rule. |

The initial wider-table focus defect was also found by this reviewer and resolved
before its final report. Parent verification additionally fixed phone heading
scroll placement and retained the unsaved comment draft across Media/Notes switches.

These were local code reviews. There is no claim of external Bugbot or OCR approval.

## PR service status

On 2026-11-24, PR #37 was open, draft and mergeable at `c2eb40a`.
It had no submitted GitHub reviews or status checks. Greptile posted that the
organization was out of review credits, so its external review did not run:
https://github.com/gordo-v1su4/review-room-svelte/pull/37#issuecomment-7123782281

The local review evidence above remains separate. No billing, credit purchase,
merge or deployment action was taken. User UI acceptance remains pending.

## Metadata dropdown follow-up

Focused Standards and Spec reviews compared the new metadata changes against
`8b638cc`. Standards reported no findings. Spec reported two P2 findings, both
resolved and rechecked: keep incompatible asset classes visible but disabled,
with an independent callback guard; bound menu width and wrap long labels.

Native browser checks verified all four class labels and disabled still-image
choices for a video source; Nano Banana Pro selection; Custom model entry; a long
saved custom-model label wrapping without internal horizontal overflow; multiple
reference selector semantics; and Escape returning focus to its trigger. Phone
model choices were shown in the inset Asset fields panel. Reference options were
empty in this fixture, so selecting multiple actual reference images is not
claimed as browser-verified. No production metadata was saved. User UI acceptance
of this shared desktop/phone correction remains pending.
