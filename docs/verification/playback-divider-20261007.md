# Playback handoff and divider checks — October 7, 2026

V1S-180 implementation is ready for frontend deployment; V1S-170 remains an intermittent production investigation. V1S-181 measurements below cover production with the full canonical 13-asset gallery. No divider patch was justified by the measured result.

## Playback handoff

Native Codex Browser, Windows desktop, unthrottled production connection, 1280×720: selecting VID_20261005_00024 produced loadstart at 75.6 ms and loadeddata at 343.9 ms after the instrumented click. The original player had no poster and its opaque Preparing playback panel covered that interval. This was a warm observation, not a cold first-visible-frame measurement.

Player now receives the selected poster, uses active-only `preload="auto"`, displays that poster during load, and reduces the loading label to a small corner status. Explicit Play can queue against the native source; Pause and source changes cancel it. Destruction pauses and releases src. Processing and errors retain their existing blocking messages. No adjacent originals or hover-video requests were introduced.

Local native-browser check used `/dev/processing-workspace` with synthetic processing responses and the existing 320×180, four-second fixture clip/poster. CDP held the active original response after queued→ready. Before release: readyState 0, selected poster decoded at width 320 and visible, loading status height 23 px, Play enabled. Explicit muted Play queued; releasing the response produced readyState 4, 320×180 video, time 0.071572 and paused false. Poster removed. Close review removed every video element. This verifies the actual Workspace/Player seam, not production persistence or a universal latency budget.

Seven focused existing playback-session/pane tests passed. Svelte autofixer found no Player issues. The first aggregate check overlapped generated Convex API changes and reported eight destinationRefresh typing errors plus eight existing warnings; the parent owns the final aggregate check. No new permanent test suite was added.

## Divider production measurements

Two-pane direct pointer input changed explorer 51→60. Three-pane native `tab.drag` changed explorer 38→31; viewer changed 37→44 and feedback stayed fixed. Eight native drag moves and nine direct pointer moves reached their following animation frame in 0.5–6.8 ms. Keyboard ArrowRight changed 31→32. These samples do not establish a universal responsiveness bound.

360, 390, 768, 1024 and 1440 px width checks retained VID_20261005_00024, paused/muted playback, and an unsent comment draft. Document widths were 350, 380, 758, 1014 and 1430 px respectively: no page-level horizontal overflow. Dividers were hidden in the responsive stack and present at 1440. At 768×360 landscape, document width was 758 and video width 494; draft retained. Temporary viewport overrides were cleared and the unsent test draft was removed afterward.

The second divider's native drag changed viewer 44→38 while the explorer stayed 32. Eight sampled move-to-frame times were 0.4–1.1 ms. Six consecutive back-and-forth native drags took 1160 ms and retained the same selected asset, paused/muted state, playhead exactly 2 seconds, and unsent draft. The prior tool/native input discrepancy did not reproduce in either divider mode.

Evidence: `docs/verification/evidence/divider-20261007.json` and private screenshot `output/playwright/native-divider-20261007.jpg`. The browser ended paused and muted. No canonical originals, folders, review status, rating or comments were changed. Pane preference changes are routine reversible test input. This investigation found no current divider failure to patch on this desktop/browser; intermittent behavior on other devices remains outside these measurements.

## Remaining release acceptance

Deploy frontend and repeat poster correctness/decoded-frame handoff with cold and warm canonical clips, rapid next/previous, mute and close/navigation cancellation. Original V1S-170 codec/blank report needs actual visible frames for all ten clips and processing-to-ready/long-session acceptance. Readiness, poster display and these isolated checks do not resolve that original intermittent diagnosis.
