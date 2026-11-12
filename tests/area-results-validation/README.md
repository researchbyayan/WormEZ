# Automatic area results, build 1.2.23

The two screenshots use the existing clean-worm test fixture and an artificial 0.01 mm/px calibration displayed in cm². They verify UI and conversion arithmetic, not real-world calibration accuracy.

Verified: automatic display after results, no Optional/collapse control, approximate current and mean/range, squared selected units for every readout and plotted value, caching across scrubbing/unit changes, invalidation after uncertain-point edits, discontinuities at gaps, responsive canvas sizing, and reset cancellation. Existing raw movement measurements and export schema remain unchanged. Approximate projected 2D area does not establish body volume.
