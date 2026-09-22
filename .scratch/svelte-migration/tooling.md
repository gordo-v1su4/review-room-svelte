# Installed tooling

- Graft: existing `@nanonets/graft` CLI 0.18.0; initialized in this repository using `graft init --agents agents --no-global --no-hooks --no-statusline --yes`.
- Graph: 110 files, 591 nodes, 1,529 edges. Local ignored `graft/` cache. `graft map`, `graft ask`, and `graft check` are usable now. No new global hook configuration was installed. Repository `opencode.json` registers its MCP server for OpenCode; this is not a claim that a Codex MCP server was hot-loaded.
- Matt Pocock: 25 published engineering/productivity skills, installed into `.agents/skills/` using the Codex skill-installer helper. In-progress and miscellaneous skills excluded.
- Source: https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7
- Skills available for discovery on the next turn; their files can be read in this turn.
- Setup choices: local Markdown tracker; default triage labels; single-context documentation.
- Do not index, print, commit, or copy `.env.local` into planning artifacts.

## Personal repository

- Local checkout moved to `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte`.
- Origin: `https://github.com/gordo-v1su4/review-room-svelte.git`, private.
- GitHub rejected native forking because upstream disables forks. Created an independent personal repository instead.
- First history push was rejected because the OAuth credential lacks workflow scope. For the user-requested initial publication, the inherited deployment workflow was explicitly archived under `docs/upstream-reference/` so the personal repository does not deploy to the upstream backend. Original history is preserved.
- Local branch: `codex/svelte-migration`. Source history and all local changes preserved.
- Upstream fetch points to Buzero; upstream push is disabled. Local pre-push hook rejects Buzero URLs. Repository instructions prohibit Buzero pushes.
- Graft check passed after relocation. Approved Matt Pocock configuration applied. Seven draft migration tickets created.
