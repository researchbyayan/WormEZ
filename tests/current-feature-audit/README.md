# Current feature audit

One loading/quick-scan pass over all 21 MP4 recordings. All opened using the direct decoder. All files are H.264, yuv420p, 1280 × 720, approximately 29.97 fps. This is a decoding and setup audit, not a biological accuracy claim.

| Recording | Opens | Suggested anchors | Setup outcome |
| --- | --- | --- | --- |
| 03-05-2026 da Gal4 x w1118 L4.MP4 | Yes | 8 | Suggestions require user approval |
| 03-05-2026 da Gal4 x w1118 L6.MP4 | Yes | 8 | Suggestions require user approval |
| Additional videos to analyze/Copy of 9.15.26 ELAV-GS homozygote L1.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of 9.15.26 ELAV-GS homozygote L2.MP4 | Yes | 8 | Suggestions require user approval |
| Additional videos to analyze/Copy of 9.15.26 ELAV-GS homozygote L3.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of 9.15.26 ELAV-GS homozygote L4.MP4 | Yes | 9 | Suggestions require user approval |
| Additional videos to analyze/Copy of 9.8.26 w_ELAV-GS L1.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of 9.8.26 w_ELAV-GS L2.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of 9.8.26 w_ELAV-GS L3.MP4 | Yes | 9 | Suggestions require user approval |
| Additional videos to analyze/Copy of 9.8.26 w_ELAV-GS L4.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of MAH08642.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of MAH08643.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of MAH08644.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of MAH08645.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of MAH08675.MP4 | Yes | 8 | Suggestions require user approval |
| Additional videos to analyze/Copy of MAH08676.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of MAH08677.MP4 | Yes | 0 | Manual identification required |
| Additional videos to analyze/Copy of MAH08678.MP4 | Yes | 0 | Manual identification required |
| curved final.mp4 | Yes | 9 | Suggestions require user approval |
| irregular.mp4 | Yes | 9 | Suggestions require user approval |
| straight final.mp4 | Yes | 9 | Suggestions require user approval |

## Findings and repairs

- Twelve additional clips fail automatic identity selection, not MP4 decoding. Source frames include reflections, small low-contrast larvae, and large stimulation tools. No identity thresholds were relaxed to force an answer.
- A scan without proposals now enters the first-visible anchor placement step automatically. Approved manual anchors remain required; start/end recovery is not automatic proof of identity.
- Custom-area selection now displays animated black/white borders, including holes, over the existing faint green mask. Committed masks retain a static border.
- Added Select all, Deselect, Invert, and modifier shortcuts. Empty intersections correctly clear the selection; interrupted gestures restore the committed mask; editor disposal releases animation and canvas resources.
- Selection measurements still count original source pixels, independent of the displayed border.

## Validation scope

Unit checks: 68 passed. The browser pass passed 26 of 29 scenarios initially; the compact overflow was repaired and two stale workflow assertions were updated. All three affected scenarios then passed. The new marquee regression also passed (30 browser scenarios total across the pass and targeted reruns). The five-recording matrix passed all 65 checks; see `real-video-features.json`. The five-recording matrix exercises the actual local Petri detector and selection/calibration controls; it does not rerun full-length biological tracking. Camera lifecycle scenarios use simulated streams. No physical-camera or real-model motion-recovery accuracy claim is made.

Screenshots: `selection-editor.png`, `mask-1-0.png`, `petri-1-0.png`, and `manual-boundary.png`. Selection screenshots use deliberately drawn test regions, not independently validated physical references.
