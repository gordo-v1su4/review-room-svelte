# PR15 App VM deployment — October 6, 2026

PR15 merged into main at `ca250f21ed9050becb694050f26ad8a3457568c9`. Production already contained later destination, publication and sprite work. The frontend release therefore preserves deployed `9503a3f` and layers the reviewed PR fix commit `e8699aa` on top. The tested source is `fd014155d373650cbea026a67f5bdebcfa8fbdce`, pushed as `codex/pr15-app-vm-release` to the personal repository. It is an explicit deployed snapshot; the later stacked features have not all merged into main.

- Frontend source: `/home/gordo/review-room-svelte-releases/fd01415` on App VM.
- Image tag: `review-room-svelte-app-app:fd01415`.
- Image ID: `sha256:3495fb5e8c9755e6c19a2ef60d1887f86559c3484020cea0282a022618845f63`.
- Retained rollback tag: `review-room-svelte-app-rollback:9503a3f`.
- Public and origin `_app/version.json`: `{"version":"1791318869302"}`.
- Combined source validation: 201 tests / 1098 assertions pass; Svelte check has zero errors and eight existing warnings; production image build and desktop/phone metadata fixture checks pass.

Dockhand adopted the frontend as an Internal stack, with Compose and protected environment managed beside NocoDB. **Save & redeploy** succeeded through Hawser. The container is healthy and its environment values match the original configuration exactly: no missing, extra or changed keys. Credential values were neither changed nor committed. Explicit Compose interpolation is required for Dockhand's masked secret fields.

Live verification used the existing `Sync QA 2026-10-06` asset in two independent authenticated sessions: prompt Save persisted; a stale dirty draft was rejected with the conflict message and retained; explicit discard/reload retrieved the current value. Original empty QA metadata was restored and saved. Version switching retained `synthetic-v2.mp4`. The canonical Trailer Feed project retained 13 assets, and real video loaded with positive dimensions and no player error.

Only the frontend changed in this release. Dedicated Convex functions were unchanged. Full live image-reference and scoped-integration acceptance remain open, so V1S-164 remains In Progress. Alibaba run 37513242429 was cancelled without a complete result; it is not recorded as a pass. PR code review and source tests were completed separately before merge.
