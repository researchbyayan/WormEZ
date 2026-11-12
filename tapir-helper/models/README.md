# Local Petri dish model

The user supplied `weights.pt` (17,786,837 bytes), SHA-256
`0f3925d3dfbd0f65851a2bc8b0401d1d93fec4dba9878f87957d5352e4da7010`.
Its original Downloads copy is unchanged. No OnePetri source or weights are used.

Source: https://app.roboflow.com/moldezsegmentation/moldez_dish_finder/models/moldez_dish_finder/4
The authenticated model page identifies Roboflow 2.0 Semantic Segmentation (Base)
and an MIT model license. The exported dataset identifies CC BY 4.0.

`petri-config.json` is the active, validated configuration:
- DeepLabV3+ with MobileNetV2, three output channels; strict state loading succeeds.
- 416 × 416 stretch resize, CRT grayscale replicated to RGB, input divided by 255.
- ImageNet means [.485, .456, .406], stds [.229, .224, .225], verified in Roboflow's
  public DeepLabV3PlusSemanticSegmentation implementation (match-train parameters).
- Dish output channel **1**, verified against the actual test/validation PNG masks.
  The export `_classes.csv` lists it as 2, but actual annotation masks contain only
  pixel values 0 and 1. The CSV's display-class ordering must not override the
  validated model/mask mapping. `classes.csv` is preserved as provenance.

The model uses the existing local Python helper and CPU. Dependencies are pinned
in ../requirements-dish.txt. Encoder pretrained downloads are disabled; inference
loads only the supplied checkpoint with weights_only=True. No API key or cloud
inference is used. The model is loaded lazily and reused.

A segmentation mask supplies a contour. A smooth ellipse is fitted and the raw
segmented pixel area is retained separately. Regions smaller than 10% of the frame,
poor ellipse fits, and clipped rims are excluded. Automatic calibration additionally
requires a near-circular fit (axis ratio ≥ .92), a user-confirmed rim, and a positive
known diameter or area. Cropped/close-up recordings require another reference.
Custom shape drawing remains deferred.

Validation results and limitations: ../../tests/petri-evaluation/README.md.
