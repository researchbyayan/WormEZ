# New-feature validation and screenshot review

Build: 1.2.22 development source. Five original recordings: L4, L6, straight, curved and irregular.

## Retained passing integration checks

Each recording was checked at its first frame and a middle frame, using desktop (1440 px) and compact (940 px) layouts. The desktop round passed 65 checks. After fixing compact rim-tool visibility, the five compact cases were rerun and passed 65 checks. The combined summary records 130 passing checks, zero remaining failures in those retained cases. These are successive tested source snapshots, not a claim that every earlier run was green.

Checks: clip isolation; actual local Petri response and border/error presentation; manual rim interaction/math using an artificial test circle; rectangle, ellipse/circle, lasso; Replace/Add/Subtract/Intersect; live Magic Wand tolerance and contiguous fill; keyboard/mouse Undo/Redo; packed mask and low-opacity rendering; known-area scale and unit conversion; global history; Save/Cancel/Escape; masks restricted to their reference frame; screensaver preview/dismissal; runtime errors and external requests.

See `summary.json`; raw results and clip screenshots are in `final/` (desktop round and the original compact failures) and `compact-recheck/` (corrected compact cases). Earlier keyboard and visible-native-test failures are preserved in the root reports. Intentional test-window shutdowns are documented separately from actual failures.

## Findings repaired

- Editor Cmd+Z also reached global Undo, changing the reference mode and discarding Save. Keyboard events now stay inside the editor.
- Idle screensaver could activate during reference editing. Open native dialogs now suppress automatic idle activation.
- Area-unit input exposed floating-point noise. Display formatting is cleaned up; calculation precision is retained.
- Compact manual rim mode left the video off-screen. It now brings the video into view; off-screen issue messages do the same.
- Two progress surfaces could disagree and show 100% during model work. They share one fraction, and model waiting is indeterminate.
- Completed retry counters could describe the last tiny pass. Counters now reflect the complete clip; completed scans show an appropriate review state.
- Auto-Zoom's range input independently rounded its value. Slider, readable percentage and accessibility text now use the same magnification.
- Compact inspector rows left large holes. Content-sized cards now pack into columns; all approved anchor rows can be displayed. Layout checks cover 390, 940, 1024, 1199 and 1440 px.
- Public wording now says “motion model”; backend identifiers and stored provenance stay compatible.

The targeted browser regressions for these issues passed, including two repeats of the keyboard/screensaver cases, plus 46 unit tests and UI typecheck/build. `native-fluid-panels.png` is a screenshot of the actual refreshed Electron app with the user's saved irregular results restored (446 samples, 97% accepted). Before/after native screenshots and viewport screenshots are saved alongside it. No acceptance thresholds were changed.

## Important result: automatic dish detection

None of the ten sampled original-video frames produced an accepted complete dish rim. The app explicitly rejected these cropped/close-up/unsuitable frames and kept physical calibration unset. A rejection behaving correctly is not a positive detector success. The earlier positive control used the supplied complete validation photograph, not a larva-video frame. Manual test-circle calibration verifies interaction and arithmetic only, not a valid physical scale for these scenes.

No full tracking reruns or new biological-accuracy evaluation were performed in this new-feature pass. No camera/hardware validation is implied. `psd-tools` was reviewed for possible future PSD/mask import and was not installed.
