# Project identity — local acceptance, 2026-09-22

Restored project name, client, description, accent and local banner editing in a compact Bits UI dialog. Immutable project ids preserve folder/media relationships. Optional text and banner can be cleared; Cancel discards drafts. Banner decoding is bounded to a 1280px derivative, with replaced, stale and disposed object URLs revoked. Local permission policy requires admin plus edit access to the project; this is not live authorization.

Browser acceptance in isolated localhost IAB tabs:

- Saved Midnight studio / North coast / description / #226666 and the user-supplied folder-reference JPG as a temporary banner. Header, breadcrumb and project tree updated together.
- Cancelled a staged rename and banner removal; existing identity and banner remained.
- Saved banner removal; banner disappeared. Cleared client and description with actual keyboard input; default single-line subtitle returned.
- Empty project name disabled Save. Browser automation `fill('')` did not dispatch the expected input change in this run; keyboard select-all/Backspace verified the actual user path.
- 390×844 touch layout: sheet bounds x=0..390, y=151..844, document width 390, buttons 44px. Temporary device/touch overrides cleared when the user began using that tab.
- After user feedback, removed the header accent rule, reduced desktop settings controls and Add media to measured 28px, tightened input spacing, and replaced the oversized brown success banner with a restrained compact notice. Touch targets remain 44px.
- Direct svelte-check: 0 errors, 0 warnings. Domain tests: 3 pass, 10 assertions (normalization, clearing, invalid values, project-scoped permissions).

Changes remain tab-local. Server persistence, banner storage, owner-only visibility/membership/access rules/archive and full project administration remain required open integration/parity work.
