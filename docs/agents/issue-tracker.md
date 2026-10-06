# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

Product milestones also have tickets in the V1su4 Linear workspace. Keep those tickets current while working: move them to In Progress when work starts, check off only verified acceptance criteria, and move them to Done after the deployed behavior is proved.

## GitHub and Linear

The personal GitHub repository is connected to Linear. Include each relevant Linear issue ID in the branch name, commit message, or pull request title/body so GitHub activity attaches to the ticket. Use `Part of V1S-123` for work that is still in progress; use `Fixes V1S-123` only when all acceptance criteria are verified and the merge should close the ticket. The Review Room repository has a push webhook for commit linking. Pull request status rules move linked issues through In Progress, In Review, and Done. A commit or PR with no issue ID cannot be matched automatically.

## Conventions

OpenCodeReview runs automatically when a PR opens. After pushing fixes, dispatch `ocr-review.yml` against the current feature branch with `pr_number` so it reviews the current PR head. If diagnostic artifacts show primary-model rate limits, `fallback_only=true` runs the existing GLM fallback directly. The job disables the npm launcher's background updater with `OCR_NO_UPDATE=1` so the pinned CLI is not replaced during configuration/review. Failed or rate-limited reviews are not passes; inspect review results and resolve code findings before merging.

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
