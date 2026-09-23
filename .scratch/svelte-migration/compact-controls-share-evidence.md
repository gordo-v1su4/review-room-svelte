# Compact controls and share administration — 2026-09-22

## Implemented

- Explorer toolbar responds to its pane width: labels collapse below 620px; search becomes an expandable icon below 400px. Desktop layout icons remain on one row down to the 220px pane minimum. Coarse-pointer narrow layouts use a layout menu with 44px targets.
- Shared control edges have a restrained top highlight and quieter side/bottom edges. Media cards have no resting, active, or selected border; selection uses a subtle surface and checkbox. Keyboard focus remains visible.
- Card rating fields expose five direct stars using existing review actions; tapping the current rating clears it. Mobile cards allow 44px star targets.
- Filter classes use two columns to keep Contact sheet on one line. Boolean filters have compact 11px labels with deliberate spacing.
- Share administration has a typed gateway, safe link summaries, optional passcode/download/current-appearance settings, existing-link listing/copy, explicit loading/error/unavailable states, duplicate prevention and cancellation. Live gateway is deliberately unavailable while backend integration is deferred.

## Evidence

- 125 tests, 621 assertions pass. Added controller scenarios cover confirmed creation, failure/retry, duplicate suppression, project/permission transitions, disposal, malformed paths and offline behavior.
- Local browser: real Downloads H.264 clip imported and played during explorer divider drag to 220px; toolbar stayed in one row, no horizontal overflow.
- Phone 390×844 with coarse pointer: explorer controls and direct stars are 44px; card computed border is 0px and shadow none; page width and scroll width both 390px. Tapping four stars updates selection, tapping again returns five empty stars.
- Local share fixture: failure preserves draft, retry returns confirmed protected/download-enabled link, copy reports success. Owner revocation removes trigger. Closing an in-flight create aborts it; reopening shows no phantom link and controls are enabled.

## Remaining integration gates

Fixtures are not live access or persistence evidence. Historical backend supports optional expiresAt enforcement but no expiry-setting or revocation mutation. Before live sharing, resolve the public-review access audit, safe summary DTOs, role inconsistencies, passcode proof, per-operation expiry/archive checks, asset-bound download authorization and reviewer identity isolation. Notifications and full role-specific parity remain open.

Project accents now reach selected navigation, active controls and a quiet folder-shell tint. The main project row is brighter than nested selections; all selected nav rows remain borderless. A purple (#7e14b8) identity was applied through the phone settings UI and verified in the portaled navigation drawer. Semantic status colors are unchanged. Phone drawer navigation closes on collection selection.

Final list-card adjustment: thumbnail and row measured identical top/bottom and 76px height in the browser; media-card border 0px, radius 6px. Rating and metadata align beside the full-height thumbnail.
