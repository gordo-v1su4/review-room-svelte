# Repository skill workflow

Skills are versioned under `.agents/skills/<name>/SKILL.md`. Read the local file
when the user invokes a skill, even if the current app's cached skill picker does
not list it. New installations may require a new chat to appear in that picker.
Global installation and repository installation are separate; this repository's
files are the portable copy used by Codex, Claude and other agents.

For an explicitly requested design-to-PR sequence:

1. `grill-with-docs` loads `grilling` and `domain-modeling`; record settled visual
   decisions in the Design Spec, vocabulary in CONTEXT, and durable trade-offs in
   an ADR only when warranted.
2. `implement` implements the agreed scope. `tdd` uses agreed public behavior
   seams. Existing tests and browser checks remain required evidence at their own scope.
3. `code-review` reviews a non-empty committed diff against the pinned main
   revision on independent Standards and Spec axes. Use the originating local spec.
4. `review` selects Bugbot or Security Review. This repo includes the selected
   `review-bugbot` instructions. A dedicated Bugbot agent is a runtime capability,
   not something copying SKILL.md installs. If unavailable, say so and use an
   explicitly identified independent bug-focused agent; never label that result
   a native Bugbot service review.
5. Open the requested PR with the scope, verification limits, findings and useful
   diagrams. A local agent review is not a GitHub check. The existing OCR workflow
   is a separate reviewer; inspect its current-head result before reporting it passed.
6. Run `retro` in the same chat after the PR. Propose environment improvements by
   severity, based on the actual session. Apply chosen improvements when authorized.

Keep upstream skill instructions in their installed folders. Put runtime mappings
and repository conventions here so instruction copies do not drift.

`retro` was installed from `mattpocock/skills`, path `skills/engineering/retro`.
`review` and `review-bugbot` were copied from the existing global installation.
