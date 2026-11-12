# Local video preparation

Playback stays immediately below the picture: time, previous frame, Play/Pause, next frame, speed, Reset clip and fullscreen. The speed menu uses an icon with a tooltip identifying its current value. Reset clip and manually requesting analysis again require confirmation.

The warm-white group contains Trim, Split, Crop, Rotate and Flip. Each opens the same preparation window, separate from tracking and scientific corrections. The cool-white group contains Pan, overlays, Fit frame, Auto-Zoom, Pathway, zoom and anchor placement. The tool groups remain as equal-width vertical rails in windowed and maximized layouts. Play/Pause is centered below the picture, without a surrounding circle. Undo/Redo and analysis controls share one compact bottom row.

## Prepare a copy

1. Trim using the two handles or exact start/end frame fields. The end frame shown is included.
2. Add split points inside that range. Remove a split by selecting its labelled chip.
3. Crop by dragging a rectangle. Drag inside to move; drag a corner to resize. Reset crop restores the full frame. Encoder-compatible dimensions are rounded inward to even pixel counts.
4. Rotate in 90° steps (left or right) and flip horizontally or vertically. The preview shows the saved orientation. Crop is drawn on the unrotated source; rotation and flips are applied after the crop, rotate first, then flip.
5. Choose **Save edited copies**, then an output folder. Saving is local and uses the bundled encoder. Video audio is omitted, matching WormEZ's analysis-copy policy. The original video is never overwritten.
6. Open a saved clip to start a fresh analysis session. Review its calibration and anchors; existing scientific results are not transferred to changed footage.

The output names are unique. A `.wormez-edit.json` sidecar records original file identity, timing, crop, rotation, flips, and half-open segment boundaries. Cancellation and failures clean up files belonging to that save operation. Closing the window cancels an active encoder.

Preview controls work in the browser. Saving edited media requires the Electron application, because it uses local file dialogs and the bundled native encoder. Restart an older dev instance after updating the preload/main process.

## Design reference

The arrangement borrows interaction patterns observed in CapCut's packaged QML and the user's screenshot; proprietary code/assets were not copied. [Astryx](https://github.com/meta/astryx) was reviewed for accessible controls and theme consistency. It is a beta React design system; no Astryx runtime dependency was added to this focused change.
