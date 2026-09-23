# Project archive/restore focus — 2026-09-22

## Defect and change

Confirming archive removed the focused settings trigger and left focus on BODY. Restoring the last archived project likewise removes its dialog trigger. Both now transfer focus to the current project H1 after the DOM update. Restoring directly from the archived-project screen uses the same destination.

Desktop archive lists stay open when more archived projects remain, with focus retained in Search archived projects. Mobile restoration closes the nested archive dialog and navigation drawer; both close handlers target the project heading. Ordinary Escape dismissal retains trigger restoration. No archive permissions or retained project/media state rules changed.

## Real browser acceptance

IAB localhost, disposable tab-local Studio project and Focus second project:

- Keyboard Project settings → Archive project → Confirm archive: focus becomes H1 Studio project.
- Restore project with Enter: focus becomes H1 Studio project.
- Reopened Project settings and pressed Escape: focus returns to Project settings.
- Restored the only project through Archived projects: the dialog closes, focus becomes H1 Studio project, and no dialog remains.
- With two archived projects, restored Studio project on desktop: the archive dialog stays open and Search archived projects is focused. Escape returns to the remaining Archived projects 1 trigger.
- At 390×844 with touch emulation, opened navigation → Archived projects 2 → restored Focus second project with Enter: both dialogs close, H1 Focus second project is focused, and document width remains 390.
- Reopened mobile navigation and pressed Escape: focus returns to Open navigation, proving the restoration flag did not leak into ordinary dismissal.
- No captured warning/error logs. Temporary emulation and test tab were cleaned up.

156 tests / 849 assertions pass, Svelte check has 0 errors and 0 warnings, production build and diff whitespace check pass. These checks cover local frontend navigation, not live archive persistence or authorization. Live backend gates and the broader accessibility/browser matrix remain open.
