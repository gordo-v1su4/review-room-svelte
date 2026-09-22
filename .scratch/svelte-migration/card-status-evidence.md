# Inline card status and review alignment

2026-09-22. Local frontend evidence; backend persistence remains deferred.

- Grid/list cards expose a permission-filtered Bits UI status menu, independently of opening or selecting media. Uses the existing review transition and honors Appearance field visibility/order. Archived assets retain their separate restore workflow.
- Request changes is 120 × 32px on desktop, left-aligned with Shortlist (both x=593.95 in the observed layout); Approve stays right. List thumbnails and their buttons both measure 74px wide.
- Isolated background browser tab imported the authorized real Downloads rapper video. Awaiting review → In progress → Approved updated the card and navigation count without opening the viewer. Opening the viewer reflected Approved.
- Escape returned focus to the card status trigger. Appearance Status off/on removed/restored the trigger (0/1 count). At 390px, document width remained 390px and status target height was 44px.
- Direct Svelte diagnostics: zero errors/warnings. Review session and media selection tests: 18 pass, 87 assertions. No dev-server restart or SvelteKit sync was used, preserving the user's active local tab. Temporary QA tab closed.

Existing configurable metadata remains compact; this increment does not claim custom field schema administration or Frame.io's full metadata catalog. Live storage and full shipping acceptance remain open.
