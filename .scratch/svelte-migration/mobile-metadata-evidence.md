# Mobile metadata sheet — 2026-09-22

Local frontend acceptance only; no live backend or deployment claims.

- At 760px and below, the inspector keeps Notes beneath the player. Detailed Fields open in a Bits UI dialog styled as a bottom sheet. Desktop retains inline Notes/Fields tabs.
- Opening fields cancels a running shortlist sequence to prevent automatic asset changes during editing; ordinary video playback continues.
- An open sheet survives resize to desktop. Component-instance IDs avoid duplicate input/label IDs when inline and sheet metadata coexist.
- Close returns focus to the mobile Fields trigger, or to desktop Notes after resizing. Asset changes close a stale sheet.

## Browser evidence

Isolated in-app browser tab 17, real Downloads H.264 clip (1360×752, 8.666667 seconds).

- Entered `Keep this mobile review draft`, selected desktop Fields, resized to 390×844 with touch emulation: Notes became visible with draft intact.
- Opened sheet during playback: native video remained unpaused at 0.717898 seconds. Sheet bounds x=0, width=390, bottom=844; document width and scroll width both 390.
- Entered an unsent tag, resized the open sheet to 1440px: dialog remained open and tag draft retained. No duplicate DOM IDs. Closing returned focus to Notes.
- Typed asset code `TAKE-02` with real keystrokes, blurred, closed/reopened: value retained. Desktop Fields displayed the same saved value.
- Mobile close returned focus to Asset fields; trigger and close each measured 44px high. Comment draft remained intact.
- No runtime errors after the final correction. Initial QA caught a Bits ref binding initialized to undefined; changed initialization to null and reran on a fresh page.
- Screenshot capture was scaled incorrectly under device emulation; layout claims above are based on rendered DOM bounds and visible control state, not detailed screenshot fidelity.
- Viewport/touch overrides cleared; temporary QA tab closed.

## Static checks

`bunx svelte-check --tsconfig ./tsconfig.json`: 0 errors, 0 warnings. `git diff --check`: clean.

## Remaining

Full responsive/browser and accessibility matrix remains open. Unsubmitted metadata-entry drafts are retained while the sheet stays open, including resize; closing discards those unsent entry drafts. Saved metadata and comment drafts survive closing within this local session. Durable persistence remains deferred.
