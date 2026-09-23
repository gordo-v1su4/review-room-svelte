# Review focus acceptance — 2026-09-22

## Defect and changes

Before the fix, activating Close review with Enter removed the focused control and left `document.activeElement` at BODY. Keyboard users lost their position in the explorer. Inbox note navigation likewise let the closing dialog return focus to its trigger rather than the destination notes.

`MediaCards` and `AssetTable` now forward the activation event. Keyboard or assistive activation enters the review heading, whose next tab stop is Close review. Pointer activation keeps its existing focus behavior. Closing review focuses the current asset's visible card/table button, with the Media heading as fallback when filtering removes that asset. Selection state and sequential navigation still use the existing selection function; no player node is reparented during resize.

The inbox suppresses automatic trigger restoration only when its explicit note navigation successfully focuses the destination Notes tab. Ordinary dismissal retains normal dialog focus restoration. The timeline is omitted from sequential tab order until ready, and loading has a status announcement.

## Browser evidence

IAB local workspace with real Downloads clip `camera_rotating_around_rapper_in_music_video_a51538.mp4`:

- Grid Enter → review H2 receives focus; Tab → Close review; Enter → original clip button receives focus.
- Table Enter → viewer, then Close review Enter → current clip's table title button.
- Published a device-local note, opened the sidebar inbox, activated Open note with Enter → selected Notes 1 tab receives focus after the dialog closes.
- At 390×844 with touch emulation: Notifications → View inbox → Open note → Notes 1 receives focus. Document width remained390, without horizontal overflow.
- Reopened Notifications → View inbox and dismissed with Escape → Notifications regains focus; note-navigation focus behavior does not leak into dismissal.
- Filtered the active clip out, then closed review → Media H2 receives focus rather than BODY or a removed card.

## Validation and limits

Production follow-up: personal deployment `2cb971618d4b42fe963a98333d480c9c9e47794f` was verified at `https://review-room-svelte.vercel.app/`. In a fresh tab, the same real Downloads clip opened by Enter with focus on the review H2; Tab then Enter closed review and returned focus to its card. Pointer entry retained card focus. Playback advanced past 6 seconds with native readyState 4 and a local blob source. A device-local note opened through Notifications → View inbox → Open note transferred focus to the selected Notes 1 tab. No warning/error logs were captured. This verifies hosted frontend behavior, not remote media upload, live notes or persistence.

156 tests /849 assertions pass; Svelte check 0 errors/0 warnings and build pass. These are scoped browser focus checks, not a screen-reader certification or complete accessibility audit. Speech/caption support, contrast audit and physical browser/device coverage remain unverified. Existing pane-arrow, timeline-arrow and edit-field key ownership evidence remains in keyboard-navigation-evidence.md. Backend and live authorization gates remain deferred.
