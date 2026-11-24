# Phone refresh plan and UI approval

Current step: **5 — Final responsive review; walkthroughs shown, UI approval pending.**

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
user's feedback, implement adjustments, and record approval when provided. Keep
working through implementation and walkthroughs while acceptance is pending;
pending UI approval does not stop development. Keep the current step visible in
chat. Final UI approval still gates PR readiness, merge and deployment.

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
   - [x] Demonstrate opening an asset, notes, previous/next and returning to its folder.
   - [ ] Record user's approval of review navigation.
3. **Tools and panels**
   - [x] Group secondary actions under Tools.
   - [x] Implement inset panels, sticky heading/close and publishing Section chooser.
   - [x] Demonstrate project/folder tools and publishing sections, scrolling and closing.
   - [ ] Record user's approval of tools/panels.
4. **Asset table**
   - [x] Implement expandable phone rows and retain the wider table.
   - [x] Demonstrate expanding fields, selection controls and opening/returning from review.
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
- 2026-11-24: User reaffirmed original desktop layout, retaining requested dropdown/styling corrections. Restored desktop folder controls to baseline 32px, 10px padding and original borders; compact face changes are phone-only. Desktop project tool heights restored. Compared original commit in an isolated baseline checkout: heading 21px, topbar 58px, Add media 28px, library folder/filter 32px and explorer toolbar 50px match. Existing 300px sidebar request retained. Found Square appearance preference in the working preview versus Landscape in baseline and restored Landscape via Appearance. Phone video frame now measures 398.02 × 223.88 at measured viewport 430 × 767 (16:9). User requested continued work, so individual pending acceptance boxes no longer stop implementation/walkthroughs.
- 2026-11-24: Continued visible phone walkthrough: next/previous asset, Notes section and Back to folder; Tools → publishing Upload/Private review and closing both panels; expanded table row → Open review → Back to folder, preserving expansion and reachable Menu. Corrected Tools project buttons to 28px within the phone-only portal. Found and fixed publishing's horizontal overflow from a long destination name: publishing body and descendants now fit (no overflowing descendants). Final UI acceptance remains pending; no approval is inferred.
