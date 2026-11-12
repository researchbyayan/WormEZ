# Local dish-model validation — 2026-11-08

The user supplied weights.pt from Roboflow moldez_dish_finder/4. It loads strictly
as DeepLabV3+ / MobileNetV2 with three output channels. Verified preprocessing is
416 × 416 stretch, CRT grayscale replicated to RGB, ImageNet mean/std normalization.
The model page identifies MIT; dataset export identifies CC BY 4.0.

## Mapping correction

The exported CSV names Petri-Dish as pixel value 2. Actual annotation PNG masks
contain values 0 and 1, and the checkpoint's channel 1 matches their dish region.
Channel 2 produced no dish region. Therefore the active mapping is channel 1,
validated against all 15 exported test/validation masks. The CSV is retained in
tapir-helper/models/classes.csv to make this discrepancy explicit.

## Measurements

- Five exported test images: mean dish intersection-over-union 98.9924%; range 98.5636%–99.3880%.
- Ten exported validation images: mean dish IoU 98.5163%.
- Warm CPU segmentation median: 0.538 seconds/image on this Intel Mac.
- Strict checkpoint loading, actual loopback GET /petri/status and POST /petri/detect passed.
- HF_HUB_OFFLINE=1 used; no image uploads or inference API keys.

These are existing dataset splits, not newly collected independent validation.
High mask overlap does not establish calibration accuracy or performance on larva videos.

## Recording domain check

Checked the first source-resolution frame of L4, L6, straight, curved, irregular.
L6 produced a dish-sized ellipse candidate, but its boundary is near the frame edge
and its axis ratio is below the automatic calibration requirement. L4 is cropped;
straight/curved/irregular show close-ups without a complete dish. These frames must
not acquire an automatic physical scale. A small false positive around the larva
in curved was caught during development and excluded by the minimum dish-area gate.

The white rim is a fitted ellipse, not the jagged mask. Raw segmented pixel area is
reported separately. Calibration requires a complete near-circular fit, a known
physical diameter or area, and explicit confirmation. No scale is silently inferred
from a nominal dish size. See results.json and recordings-preview.png.

## Reproduce

Run the local helper Python on tests/petri-evaluate.py, passing the downloaded
Roboflow PNG-mask dataset ZIP as its argument. It evaluates masks and the five
recordings without network access. Runtime pins are in tapir-helper/requirements-dish.txt.

Source dataset: https://universe.roboflow.com/moldezsegmentation/moldez_dish_finder
Model page: https://app.roboflow.com/moldezsegmentation/moldez_dish_finder/models/moldez_dish_finder/4
Normalization reference: https://github.com/roboflow/inference/blob/main/inference/models/deep_lab_v3_plus/deep_lab_v3_plus_segmentation.py

## November 9 live app demonstration

The actual local detector ran through Electron on `source-photo.webm`, a one-second repetition of an unannotated real photograph from the supplied validation archive (provenance in `source-photo.json`). This is a detector/selection UI demonstration, not a moving-larva tracking test or independent model validation. The successful response took 1.119 seconds including the app's request/response; no model output was mocked. `live-detector.png` shows the green border only; `custom-area-tools.png` and `custom-area-mask.png` show the optional manually selected green mask. The photograph is tilted, so a detected outline does not grant automatic physical calibration.

L6 frame 0 was rejected by the complete-rim UI gate; sampled frames 300, 900, 1800, 2700 and 3500 did not yield a complete acceptable rim. The helper's frame-2700 ellipse crossed the frame edge. These are legitimate limitations, not a successful L6 calibration. The existing minimum dish-area and full-frame/perspective gates were retained.
