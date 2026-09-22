# Local import queue — 2026-09-22

Added a two-worker local preparation queue with captured project/folder/classification destinations, per-file errors, retry/cancel and finished-item cleanup. Object URLs transfer to the workspace only on successful commit; aborted, failed and stale results are released. Retrying cannot allow an older attempt to commit. Leaving the workspace aborts pending work.

Native image loading and video first-frame decoding validate each file before it enters the explorer. Review caught that container metadata alone did not establish decodability; the final adapter waits for loadeddata and HAVE_CURRENT_DATA, with dimensions/duration validation and a 15-second timeout. Poster generation remains optional background work.

## Verification

- Focused queue/folder tests: 13 pass, 90 assertions. Covers concurrency, captured destinations, cancellation/late completion, retry, failed commit cleanup, disposal and date-folder placement.
- Direct svelte-check: 0 errors, 0 warnings.
- Isolated localhost browser: real Downloads H.264 MP4 and JPG plus a deliberately incomplete MP4 produced two ready assets and one individual error. Repeated after the decoded-frame fix. Explorer opened without selecting a viewer.
- Retrying the corrupt file retained its error and did not duplicate either valid asset. Clearing finished removed successful jobs and retained the failed job.
- An additional JPG import preserved the selected video and its end playhead. This does not prove uninterrupted playback: the short clip had naturally ended before import.
- At 390px width the queue spans x=12..378 (366px), document scroll width remains 390px, and Close/Retry/Clear controls measure 44px. Device and touch overrides immediately cleared.
- Desktop project settings rechecked alongside this work: Choose image, Remove, Cancel and Save changes each measure 28px.

## Remaining gates

Files remain local to the tab; no network upload or durable storage is claimed. Main-area OS file-drop handling is implemented, but browser automation rejected the native drag API, so this path still needs manual browser verification. Cancellation and destination-race behavior are controller-tested, not established by native browser interaction. Live uploads, authentication, authorization, persistence, multipart failures and URL refresh remain open.

Follow-up: restored the original filename-extension recognition contract for missing/generic MIME types: MP4/MOV/M4V/WebM/AVI/MKV and JPG/JPEG/PNG/GIF/WebP/AVIF, case-insensitive and final extension only. Three public import tests cover those formats, MIME-only recognition and unsupported/misleading suffixes. These are recognition tests, not evidence that every container/codec decodes in every browser; native first-frame validation remains mandatory.
