# Phone refresh plan and UI approval

Current step: **Complete — UI approved, PR #37 ready, reviews addressed and retro recorded.**

**PR AUTHORIZED (2026-11-24): User approved the current UI and explicitly requested sending the PR, reviews and retro. Reopen #37 against main. Merge/deployment remain outside scope. Earlier hold notes are historical.**

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
chat. UI acceptance is recorded separately from the explicit future PR authorization.

1. **Browsing — CURRENT**
   - [x] Show requested refinements: compact 28px button faces, matching corners/padding, borderless folder links, consistent colored folder labels and hover fill.
   - [x] Restore published desktop sidebar widths and styling after the user reaffirmed phone-only scope; the earlier 300px exception is superseded.
   - [x] Implement persistent Menu/location/Tools/Add header.
   - [x] Implement vertical collapsible folders and separate wrapping filters.
   - [x] Remove sideways phone navigation and wrap the folder path.
   - [x] Demonstrate project → nested folder → back, filters, and folder collapse.
   - [x] Record user's approval of browsing.
2. **Review and notes**
   - [x] Add user-requested themed metadata dropdowns, visible file-compatible asset classes and image model presets on phones; wider native controls preserved.
   - [x] Record user's approval of the metadata dropdown follow-up.
   - [x] Implement dedicated Media / Notes & info sections and Back to folder.
   - [x] Verify draft retention and inbox navigation locally.
   - [x] Demonstrate opening an asset, notes, previous/next and returning to its folder.
   - [x] Record user's approval of review navigation.
3. **Tools and panels**
   - [x] Group secondary actions under Tools.
   - [x] Implement inset panels, sticky heading/close and publishing Section chooser.
   - [x] Demonstrate project/folder tools and publishing sections, scrolling and closing.
   - [x] Record user's approval of tools/panels.
4. **Asset table**
   - [x] Implement expandable phone rows and retain the wider table.
   - [x] Demonstrate expanding fields, selection controls and opening/returning from review.
   - [x] Record user's approval of phone table.
5. **Final responsive acceptance**
   - [x] Check representative 320px/430px phone and 641px/1280px wider layouts locally.
   - [x] Show the final layouts after any user adjustments.
   - [x] Record user's final UI approval.

## PR and wrap-up

- [x] Closed the prematurely opened draft PR #37 at the user's request; no merge.
- [x] Separate explicit PR authorization received after UI approval.
- [x] Re-run relevant checks/review for any further implementation changes.
- [x] After explicit PR authorization, include UI acceptance, review evidence and relevant diagrams.
- [x] Run `.agents/skills/retro/SKILL.md` after the PR is ready; present improvement candidates.
- [x] Finish the goal only after these steps are complete.

No merge or deployment is included. Actual signed-in local playback is now verified separately from fixtures; uploads/publication and physical iPhone acceptance remain unverified.

## Acceptance log

- 2026-11-24: Drawer approved by user: "that looks identical on both ... that one looks good."
- 2026-11-24: Five design recommendations approved for mobile only.
- 2026-11-24: User requested explicit screen-by-screen UI approval and a visible plan/goal. New screens remain unapproved.
- 2026-11-24: Browsing walkthrough shown in the visible native browser at a verified 430px viewport: project → episode → nested folder → back; collapse folders; Videos filter; return to All media. Browsing approval is pending.
- 2026-11-24: User requested uniform compact controls and folder hover behavior. Verified phone Tools/Add/filters/folder links all have 28px faces and 5px corners; expanded tap areas remain. Verified folder entry/back navigation and no horizontal overflow at 430px. At 1280px with mouse input, sidebar is 300px; connected and ordinary folder hover fills both compute to rgba(27,32,34,.125), radius 5px, and connected text remains rgb(143,185,242). Existing font declarations retained. `bun run check`: zero errors, eight existing warnings; Svelte autofixer reviewed (pre-existing non-style suggestions only). User approval remains pending.
- 2026-11-24: User reaffirmed original desktop layout, retaining requested dropdown/styling corrections. Restored desktop folder controls to baseline 32px, 10px padding and original borders; compact face changes are phone-only. Desktop project tool heights restored. Compared original commit in an isolated baseline checkout: heading 21px, topbar 58px, Add media 28px, library folder/filter 32px and explorer toolbar 50px match. Existing 300px sidebar request retained. Found Square appearance preference in the working preview versus Landscape in baseline and restored Landscape via Appearance. Phone video frame now measures 398.02 × 223.88 at measured viewport 430 × 767 (16:9). User requested continued work, so individual pending acceptance boxes no longer stop implementation/walkthroughs.
- 2026-11-24: Continued visible phone walkthrough: next/previous asset, Notes section and Back to folder; Tools → publishing Upload/Private review and closing both panels; expanded table row → Open review → Back to folder, preserving expansion and reachable Menu. Corrected Tools project buttons to 28px within the phone-only portal. Found and fixed publishing's horizontal overflow from a long destination name: publishing body and descendants now fit (no overflowing descendants). Final UI acceptance remains pending; no approval is inferred.

## Latest recovery and refinement

- [x] Reproduced unexpected-token error: metadata API followed a sign-in redirect and returned HTML. GET/POST now return JSON 401 when unauthenticated.
- [x] Signed into the local app using its existing owner login; actual production-backed media loads locally.
- [x] Restored published desktop baseline, including sidebar/footer/native metadata controls; new UI rules are phone-only. Matched desktop view settings to published Landscape/medium.
- [x] Compared the same real Trailer Feed library at 1280×900: sidebar, topbar, heading, filters/folders, toolbar, Add media and card geometry match. Saved before/after screenshots outside Git.
- [x] Added a dev-only visible phone frame so browser emulation resets cannot turn the preview back into desktop.
- [x] Verified real video playback advances and Play once stops at the end; Previous/Next move between assets and return correctly.
- [x] One-screen review fits 430×768 and 320×640 without vertical or horizontal scrolling; 16:9 maintained.
- [x] Applied requested slimmer controls, overlaid Fullscreen, removed phone ready bar/duplicate metadata, retained volume orientation and current decision-button sizing.
- [x] Reproduced Fields group jump (about 116px); fixed panel height, anchored tools/footer and centered controls. After the opening transition, all six groups have identical panel/tool/footer positions.
- [x] Finish Fields screenshots and source review; user feedback received and Media/Notes styling adjusted.
- [ ] User will check on a physical phone; do not infer that acceptance from emulation.

- 2026-11-24: User rejected underlined Media/Notes tabs. Replaced them with borderless 28px selectors, 5px corners, subtle hover fill and selected fill. Keyboard focus uses stronger fill without an outline. Native phone verification confirmed both buttons switch sections, border 0px, outline none, shadow none. Changes are confined to <=640px CSS. Screenshot: phone-media-selectors.jpg in the external mobile-proof folder. Final UI approval remains pending; PR hold unchanged.

- 2026-11-24: User requested matching thin/translucent vertical panel scrollbars and no horizontal scrollbar. Actual publishing body and nested version list had computed scrollbar-width:auto and thumb alpha .72. Applied the app's existing thin/4px styling and --scrollbar-thumb (alpha .20) throughout phone panels, including their nested scroll regions. Horizontal overflow is hidden on panel shells and publishing scroll containers. At 320px and 430px publishing clientWidth equals scrollWidth; nested lists also fit. Browser verified thin, 4px fallback and alpha .20. Wider layout rules are unchanged. Screenshot phone-publishing-scrollbar.jpg outside Git. No publishing action performed.

- 2026-11-24: User approved the compact stars and bookmark appearance on black: "that's nice ... the size that it is ... for sure." Preserve this treatment. User rejected a draw-over menu; clarification requested to identify whether Workspace tools, Publish & share or left drawer is meant before altering the previously approved drawer. A suspected Back-to-folder bounce was not reproduced in the focused follow-up: after activation the asset query was removed and the folder remained visible across settled checks. No navigation fix is claimed or introduced from that inconclusive observation.

- 2026-11-24: Expanded real-media table row fits at 320px (clientWidth/scrollWidth both286). Open review then Back to folder preserves expansion. Replaced phone-row native Status/Rating selects with PhoneSelect; desktop snippets/table are unchanged. User rejected bulky menus and requested icon-only bookmarks. Removed PhoneSelect coarse-pointer expansion (16px/44px) and overrode Stage1Select coarse sizing only at <=640px; dropdown text/rows now11px/28px. Phone table bookmark has no visible Shortlist label, retains its accessible name, and measures28x28. Native browser confirmed Status option11px/28px and icon-only bookmark. No status/rating/bookmark mutation was performed. Svelte autofixer reports no issues for AssetTable/PhoneSelect; check reported zero errors/eight existing warnings before the final cosmetic adjustments. The main drawer remains unchanged.

## Latest control consistency pass

- [x] Fields group row spans from All at the left to Creative at the right with evenly distributed gaps.
- [x] Search and completeness match exactly:28px height and equal widths (123.18px each at320px viewport); both12px text.
- [x] Tags/input focus has border0,outline none,shadow none; tinted fill replaces clipped rings. Production notes/Prompt start112px high.
- [x] Fields trigger28px; note time label12px,checkbox16px. Hamburger square border removed. Empty nested-folder subtitle and excess heading spacing removed on phones.
- [x] Phone status/version menu rows28px/12px; icon-only bookmark retained.
- [x] User explicitly expanded desktop scope to remove all remaining native blue product dropdowns. All product native selects replaced; native selects remain only on dev preview/QA routes. Desktop filter trigger remains36px and table status semantic color hooks are retained.
- [x] Focused Spec review found two issues (desktop filter height, table status color hook); fixed and re-reviewed with no new findings. Check0errors8existingwarnings;330tests pass. Autofixer findings outside replaced controls are existing suggestions/link diagnostics.
- [x] UI approved; PR publication authorized. Merge/deploy remain separate.

- 2026-11-24: User approved current phone/Fields styling and wider layout: "everything looks fine ... desktop is not hurt" and explicitly authorized sending PR and completing reviews/retro. Final requested tweaks: plain Current status (Make current remains actionable for noncurrent takes), Fields X hover white with no filled/outlined box. Physical iPhone acceptance is not claimed.

- Final handoff: PR#37 reopened/ready after explicit UI and PR approval. Current main3131297 merged without conflicts.362tests pass;check0errors8existingwarnings;build passes. Final Standards/Spec and compatibility bug findings addressed; fullscreen portal fix source rechecked. Retro completed in retro.md; proposals presented without altering CI/global guidance. No merge/deploy performed.

- Card follow-up: Appearance Shortlist now displays an empty/filled bookmark before rating stars, no textual state or corner duplicate;4px spacing between controls. Browser checked both states without metadata mutation. This user-requested shared card refinement is included in PR#37.

- Mobile spacing follow-up: user requested halving the gap between review stars while preserving the bookmark-to-stars gap. Changed only <=640px review rating gap from16px to8px. Native preview computes8px between stars and16px between bookmark and rating group. Desktop/card spacing remains as previously approved. Included in PR#37.
