# Frame.io interaction observations — 2026-09-22

Inspected the user-opened authenticated Frame.io project through the in-app browser. Read-only navigation, layout controls, inspector and thumbnail hover only. No content uploaded, shared, deleted or commented on.

- Project overview stays quiet: compact toolbar, restrained project cards, generous unused space.
- Project navigation uses a stable asset tree. Explorer stays primary; viewer and metadata are separate optional panels.
- Appearance includes grid/list, S/M/L cards, 16:9 / 1:1 / 9:16, fit/fill, card information and title density.
- On the inspected video card, hover changed the offset of a large image sheet inside the thumbnail crop. Two image elements (poster and sheet), no thumbnail video element. This proves the observed card uses sprite previews; it does not prove every Frame.io asset uses that path or establish a measured latency.
- Hover preview did not replace the asset selected in the main viewer.
- Fields inspector exposes search, groups and empty/filled filtering. Technical fields sit alongside status, keywords, notes, model/prompt, release information and other project metadata. Unknown fields remain empty.

## Review Room application

Keep the user's restrained black/charcoal and teal direction, rectangular seek marker, compact controls and independent explorer/viewer/inspector. Restore original metadata controls, add typed creative/custom fields, reusable tags and bulk tagging. Preserve all original role checks when live adapters return.

Local hover now uses96 lazy positions with a bounded frame cache and native seek for uncached positions. Existing server sprite integration and measured latency comparison remain follow-ups; no claim of Frame.io-equivalent latency yet. No signed media URLs or private reference media are stored here.
