# Larva specialist preparation

Candidate: compact U-Net/MobileNetV2, one body-mask class. No model trained yet.

150 unreviewed crops are prepared from all five supplied recordings, 30 each. The source-pixel crop transform and frame IDs are in manifest.json. Crops use existing contours only to choose a region, never to create ground truth. A wrong, clipped or ambiguous crop must be skipped. L4/straight/curved are training; L6 is validation; irregular is held-out testing. This is recording-separated, but five recordings still limit generalization.

Open review.html locally and select its prepared frames folder once, or serve the repository through a loopback HTTP server. The folder picker avoids browser restrictions on reading file-image pixels into a canvas. Draw the visible body with the existing lasso or Magic Wand, with Add/Subtract and tolerance. Inspect the entire border, explicitly approve it, and download the label file. Browser-local progress is convenient but not a backup; use Download. No labels exist until approved by a human. Source crops contain no drawn boxes, H/C/T, or glow.

Run `tapir-helper/.venv/bin/python training/larva-mask/train.py /absolute/path/larva-reviewed-labels.json --validate-only` first. Validation rejects unreviewed/unknown/duplicate masks, dimensions and corrupted pixel counts. A pilot needs at least 10 training, 5 validation and 5 test masks; the prepared 150 should be reviewed before a serious comparison. These minimums are execution guards, not a claim of sufficient accuracy.

Without `--validate-only`, training uses the already installed PyTorch/SMP dependencies, two CPU threads, 256×256 RGB crops, compact decoder, BCE+Dice loss and no pretrained-weight downloads. Validation selects the checkpoint; test data is scored only afterward. From-scratch results are provisional. Training cannot start honestly until reviewed labels are supplied.

Before deployment: compare boundary distance, area error, center error, reflection selections and CPU latency against OpenCV on held-out data. Export/quantization follows that comparison; no model or predicted mask is wired into WormEZ automatically. Never use the feathered display as ground truth. Original recording-level coordinates are recoverable from each crop transform.
