# Phone refresh plan and UI approval

Current step: **1 — Browse folders and media, awaiting user review.**

This checklist records delivery progress and user acceptance separately. Local
checks and code review do not approve the UI on the user's behalf.

## Settled scope

- [x] User approved the five proposed phone behaviors; canonical decisions are in Design Spec section 15.
- [x] User approved the drawer in the native and Chrome comparison.
- [x] Use the native browser for subsequent review.
- [x] The new workspace/panel arrangements apply at 640px and below; preserve wider layouts.
- [x] Implement the first pass, run code reviews and address their findings.
- [x] Run checks: zero type errors, 330 passing tests, successful build.

## Visible walkthrough — one flow at a time

For each step: show the native phone preview, demonstrate the flow, collect the
user's feedback, implement adjustments, and record explicit approval here before
moving to the next acceptance step. Keep the current step visible in chat.

1. **Browsing — CURRENT**
   - [x] Implement persistent Menu/location/Tools/Add header.
   - [x] Implement vertical collapsible folders and separate wrapping filters.
   - [x] Remove sideways phone navigation and wrap the folder path.
   - [ ] Demonstrate project → nested folder → back, filters, and folder collapse.
   - [ ] Record user's approval of browsing.
2. **Review and notes**
   - [x] Implement dedicated Media / Notes & info sections and Back to folder.
   - [x] Verify draft retention and inbox navigation locally.
   - [ ] Demonstrate opening an asset, notes, previous/next and returning to its folder.
   - [ ] Record user's approval of review navigation.
3. **Tools and panels**
   - [x] Group secondary actions under Tools.
   - [x] Implement inset panels, sticky heading/close and publishing Section chooser.
   - [ ] Demonstrate project/folder tools and publishing sections, scrolling and closing.
   - [ ] Record user's approval of tools/panels.
4. **Asset table**
   - [x] Implement expandable phone rows and retain the wider table.
   - [ ] Demonstrate expanding fields, selection and opening/returning from review.
   - [ ] Record user's approval of phone table.
5. **Final responsive acceptance**
   - [x] Check representative 320px/430px phone and 641px/1280px wider layouts locally.
   - [ ] Show the final layouts after any user adjustments.
   - [ ] Record user's final UI approval.

## PR and wrap-up

- [x] Open PR #37 to main with diagram, review findings, checks and limitations.
- [x] Mark PR draft while UI approval is outstanding.
- [ ] Re-run relevant checks/review for any further implementation changes.
- [ ] Update PR with UI acceptance evidence and mark ready after user approval.
- [ ] Run `.agents/skills/retro/SKILL.md` after the PR is ready; present improvement candidates.
- [ ] Finish the goal only after these steps are complete.

No merge or deployment is included. Real-media playback, successful upload and
physical iPhone behavior remain separate from synthetic local UI evidence.

## Acceptance log

- 2026-11-24: Drawer approved by user: "that looks identical on both ... that one looks good."
- 2026-11-24: Five design recommendations approved for mobile only.
- 2026-11-24: User requested explicit screen-by-screen UI approval and a visible plan/goal. New screens remain unapproved.
