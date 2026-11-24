# Phone refresh retrospective — 2026-11-24

Run after PR #37 was reopened and marked ready at the user's explicit request. Sources: this chat, `plan.md`, `review.md`, `spec.md`, Design Spec section15, `docs/agents/skill-workflow.md`, `package.json`, and both files under `.github/workflows/`.

## Improvements, in priority order

1. **Catch desktop drift before showing a phone change.** The session repeatedly changed wider geometry despite a phone-only requirement. Add a small browser acceptance matrix at320/430/641/1280, with screenshots of the same project, folder, media and appearance preferences. Compare wider screenshots with a pinned base. Include coarse-pointer mode: several oversized menus came from touch rules, not width rules. Tests/typecheck/build did not catch these visual regressions.

2. **Run existing quality checks before merge.** The repository has working check/test/build commands. Its two workflows are production deployment on main and an explicitly requested OCR review; neither is a general pull-request quality gate. Add a pull_request workflow running the existing Bun checks, tests and build. Keep visual evidence separate from those green checks. This would also make reviewer evidence visible on the PR without relying on chat claims.

3. **Use one current acceptance record.** The plan, review log and PR body accumulated contradictory old scope/approval statements. Keep an authoritative current scope/acceptance block at the top, and clearly label older entries as history. Record UI approval, permission to open a PR, and permission to merge/deploy independently. A single current-status pointer should lead Codex and Claude to this record.

4. **Make product dropdown consistency mechanical.** Repeatedly finding native blue menus led to an exhaustive conversion late in the session. A narrow source check can flag product `<select>` elements while explicitly allowing dev preview/QA controls. Review callbacks, options, disabled states and geometry separately; a source scan cannot prove those semantics. Shared dropdowns also need a fullscreen portal test: the bug review caught a menu outside the fullscreen subtree that normal screenshots missed.

5. **Shorten the browser loop.** Keep one visible phone workbench and two named comparison tabs; avoid repeated full-page snapshots and extra comparison servers. The baseline helper shared dependency caches and complicated the dev process. Production builds also required a dev restart before a reliable live preview. Record the running listener and verify the rendered app after a build; avoid restarting from a transient observation alone. Capture the actual frame with verified screenshot coordinates rather than repeatedly guessing crop scale.

## Repository-local skills and discovery

The portable copies live under `.agents/skills/`, including `retro`, `review` and `review-bugbot`. `AGENTS.md` points to `docs/agents/skill-workflow.md`; `CLAUDE.md` imports AGENTS and points to that workflow. This makes the selected skills and runtime mappings travel with the repository and appear in code review. Global installations remain useful for unrelated projects but do not prove that a checkout has a skill or that its runtime provides a dedicated Bugbot agent.

The workflow correctly distinguishes native Bugbot from an independent compatibility bug review. Keep that mapping in the repository workflow rather than modifying copied upstream skills. A fresh app chat may be needed for picker discovery; direct local SKILL.md reads remain usable immediately.

## Outcome and limits

The user approved the refreshed phone UI and preserved desktop arrangement, then authorized the PR. Standards/Spec and independent bug reviews ran; findings were addressed. PR includes a Mermaid flow and verification limits. The latest main changes were integrated. Physical iPhone/fullscreen acceptance remains unclaimed; the native browser rejects fullscreen requests. No merge or deployment was performed.

The improvements above are proposed follow-up work, not unrequested changes to global guidance, CI or production infrastructure. No global memory files were changed.
