# Folder drag/drop parity

2026-09-22. Local frontend acceptance; live mutations remain a separate gate.

- Media thumbnail/title and table title are native drag sources. A checked source carries visible checked assets; an unchecked source carries itself. Real tree folders and project root accept moves; metadata collections do not. Same-location, cross-project, archived, stale and unauthorized drops are rejected.
- Drag payload contains a per-drag token, checked against the in-memory drag session; foreign/external payloads cannot initiate moves. Drop-time placement/access validation precedes the existing folder transition.
- Existing touch/keyboard Move dialog shares the same move handler. Both paths now retain the active viewer when an asset leaves the current folder.
- Domain tests first failed on the missing module, then passed: 11 folder/drag tests, 69 assertions. Direct Svelte diagnostics reported zero errors/warnings; diff whitespace check passed.
- Isolated IAB QA imported the real Downloads rapper MP4 and reference JPG. Native mouse drag moved one video from date folder to Final cuts, then a checked group moved both assets to Final cuts; destination counts and status notices updated. Table title drag moved a root video back into the date folder. Valid targets displayed the teal outline.
- Active-video root move retained timeline 0.041666s before/after, one mounted viewer, and comment draft `Keep this note while moving.`. At 390px the Move dialog completed a root move with document width exactly 390px. Temporary QA tab closed and emulation cleared.
- Browser automation needed separate mouse moves to allow native HTML drag initiation; the initial instantaneous drag did not move anything. A development reload cleared the first QA session; viewer preservation was rerun from fresh imported media and passed. No persistence claim is inferred from local session behavior.

Project administration, broader accessibility/performance work and live shipping gates remain open.
