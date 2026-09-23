# Small-label contrast and reduced motion — 2026-09-22

## Changes and measurements

The project-tree empty message and thumbnail Preview placeholder now use the existing `--muted` token. Project/folder counts use `--ink` so selected navigation gradients do not wash out small text. Sizes, geometry, card borders and brand/status colors are unchanged.

Relative-luminance contrast calculations for the inspected dark surfaces:

| Label and background | Before | After |
| --- | ---: | ---: |
| No active projects, brightest sidebar stop `#121617` | 3.71:1 | 6.38:1 |
| Preview, thumbnail background `#171b1b` | 4.00:1 | 6.09:1 |
| Count, brightest observed selected collection stop plus its 3% white badge | 3.19:1 | 8.62:1 |

These are scoped text/surface calculations, not a full contrast certification. The selected-row calculation uses the computed default-teal gradient stop `color(srgb 0.130588 0.185098 0.174118)` and badge alpha 0.03. Arbitrary brand colors and text over uploaded media still need separate acceptance.

## Browser acceptance

- Local desktop: selected Videos and inspected visible tree counts; computed text color is `rgb(205, 215, 211)`. No horizontal overflow.
- Archived the disposable tab-local project through Project settings and its confirmation. The visible No active projects message computed to `rgb(142, 156, 152)`.
- At 390×844 with touch emulation, opened navigation: all visible counts retained the new color; document width was 390. No captured error logs.
- With Reduce Motion emulated, the visible desktop review and mobile navigation drawer had no nonzero computed CSS transition/animation durations. Temporary emulation was cleared and test tabs closed.
- Thumbnail placeholder contrast was checked from its compiled source color/background, not a captured real-media loading frame.

The public shortlist slideshow is explicitly started by the user and exposes Stop preview. Its timed image changes were not treated as a CSS motion defect, and preview behavior was left intact.

## Validation and follow-up

Svelte check: 0 errors, 0 warnings. Production build and diff whitespace check pass. No domain logic changed; the existing 156-test result belongs to the preceding focus commit and was not rerun for these three CSS declarations.

The archive/restore focus defect observed during this audit was subsequently fixed and verified in [project-lifecycle-focus-evidence.md](project-lifecycle-focus-evidence.md).

Production receipt: commit `f2c701b6796b9ba82d6da66affbf1df4d7666283`, personal Vercel deployment `dpl_3DLAsirYNRozvp88Pb7ds1YsXcs4`, READY at `https://review-room-svelte.vercel.app/`. A fresh IAB tab confirmed Videos navigation, all four tree counts at `rgb(205, 215, 211)`, no horizontal overflow and no captured warning/error logs.

Live auth, authorization, persistence, upload/download and backend gates remain open. Physical devices, screen readers, full contrast coverage and the supported playback browser matrix remain outstanding.
