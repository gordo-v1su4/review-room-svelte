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
   - [x] Show requested refinements: compact 28px button faces, matching corners/padding, borderless folder links, consistent colored folder labels and hover fill.
   - [x] Show the explicitly requested desktop exception: fixed 300px sidebar at 1024px and wider; keep fonts unchanged.
   - [x] Implement persistent Menu/location/Tools/Add header.
   - [x] Implement vertical collapsible folders and separate wrapping filters.
   - [x] Remove sideways phone navigation and wrap the folder path.
   - [x] Demonstrate project → nested folder → back, filters, and folder collapse.
   - [ ] Record user's approval of browsing.
2. **Review and notes**
   - [x] Add user-requested themed metadata dropdowns, visible file-compatible asset classes and image model presets; shared desktop/phone exception.
   - [ ] Record user's approval of the metadata dropdown follow-up.
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
- 2026-11-24: Browsing walkthrough shown in the visible native browser at a verified 430px viewport: project → episode → nested folder → back; collapse folders; Videos filter; return to All media. Browsing approval is pending.
- 2026-11-24: User requested uniform compact controls and folder hover behavior. Verified phone Tools/Add/filters/folder links all have 28px faces and 5px corners; expanded tap areas remain. Verified folder entry/back navigation and no horizontal overflow at 430px. At 1280px with mouse input, sidebar is 300px; connected and ordinary folder hover fills both compute to rgba(27,32,34,.125), radius 5px, and connected text remains rgb(143,185,242). Existing font declarations retained. `bun run check`: zero errors, eight existing warnings; Svelte autofixer reviewed (pre-existing non-style suggestions only). User approval remains pending.
