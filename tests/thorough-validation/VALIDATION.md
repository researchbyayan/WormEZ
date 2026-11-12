# WormEZ reliability validation, 2026-11-10

Build: `1.2.28+20261109.thorough-fixes`. Source fingerprints are in `source-hashes.json`.

## Five full recordings

| Recording | Accepted two-pass coverage | Workflow and exports |
| --- | ---: | --- |
| 03-05-2026 da Gal4 x w1118 L4.MP4 | 86.0% | Passed |
| 03-05-2026 da Gal4 x w1118 L6.MP4 | 91.5% | Passed |
| straight final.mp4 | 100.0% | Passed |
| curved final.mp4 | 100.0% | Passed |
| irregular.mp4 | 97.1% | Passed |

Coverage means two-pass consistency, not biological ground-truth accuracy. Scan suggestions were automatically approved for workflow testing. L4 and L6 final anchors were manually placed from inspected source frames. The corrected L6 supersedes the first rim-reflection run. All recordings produced complete frame records and PDF/XLSX/CSV files; CSV row counts and column consistency were checked. Runs overlapped other checks, so elapsed times are not isolated performance benchmarks.

## Five review areas

1. **Load and recovery:** native empty workspace inspected, irrelevant controls hidden, Reset/replacement cancellation and session isolation checked.
2. **Anchors and navigation:** missing-boundary guidance, real click/Save completion, seek guards, reflection rejection, cursor-centred zoom, ordinary page scrolling, and history checked.
3. **Analysis and results:** all five complete clips, two-pass gating, pause/resume/Stop, local re-analysis, gaps, pathway screenshots, and exports checked.
4. **Calibration and areas:** saved calibration/landmarks restore correctly; Petri confirmation and known measurement are required. Native/custom-area matrix and isolated repeat reports record actual model outcomes and all area-tool interactions.
5. **Workspace and presentation:** Settings focus isolation, compact layout, error placement, source links, screensaver timing/dismissal, and screen-space feather radius checked.

## Tests and fixes

- 51 unit checks passed.
- Full browser suite: 59 passed. Follow-ups: endpoint/workspace 5 passed, scroll/zoom-coordinate/border 3 passed, feather-radius assertion passed. These follow-ups overlap the full suite; they are not 68 distinct scenarios.
- Fresh native smoke passed: renderer/preload build agreement, sidebar, Settings, and no console errors.
- Fixed empty-state clutter, Settings keyboard leakage/stacked Escape handling, saved calibration and stale save writes, unreachable missing endpoints, false final-frame rim suggestions, wheel events stealing page scrolling, and zoom-dependent feather blur.
- Feather refinement is display-only; measurements and raw contours are unchanged.

## Native area matrix

Native L6, straight and curved passed all 13 area checks each. L4 passed its 13-check isolated browser repeat against the actual local model service after the native attempt was interrupted by a frame change. The observed irregular-native repeat passed all 13 checks; see `irregular-native-observed/results.json`. Its initial individual-worm discovery progressed through all 446 frames and the complete area-tool case took 489 seconds. The earlier 180-second observation limits expired during that work; those failed attempts remain preserved, not relabelled as passing runs.

The native irregular load enters full individual-worm discovery. Its work counter progresses, but preflight can be slow on this Intel Mac. No models or thresholds were changed to hide that cost.

Screenshots, generated reports and raw check records are in this folder. The current user editing window was not automatically reloaded, to avoid losing setup edits. Ordinary scrolling over the video and revised feathering take effect when that window reloads.

## Final prelaunch check

Rebuilt the UI and passed TypeScript checking, all 51 unit checks, and 10 final browser regressions covering border rendering, L6 reflection rejection, screensaver behavior, empty state, Settings focus, saved calibration, missing endpoints and page scrolling over the video. Electron main/preload syntax and whitespace checks passed. The only app-source change after the completed review was removal of a trailing blank line in electron/main.js; fingerprints were refreshed. Launched the normal latest dev app (1.2.28) and verified its empty workspace through native UI inspection. The known native irregular-discovery latency remains documented above.
