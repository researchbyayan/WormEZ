"""Score model predictions against explicit human-reviewed H/C/T points only.

Prediction JSON: {"model":"name","frames":[{"clip":"...","frame":N,
"points":{"H":{"x":..,"y":..},"C":...,"T":...},"verifiedRecovery":false}]}
"""
import argparse
import json
import math
from pathlib import Path
import statistics


def score(reviewed, prediction):
    labels = reviewed.get("labels", [])
    if not labels or any(label.get("reviewed") is not True for label in labels):
        raise ValueError("Only explicit human-reviewed labels may be scored")
    held_out = [item for item in labels if item["split"] == "test"]
    if not held_out:
        raise ValueError("A separated test split is required")
    guessed = {(item["clip"], item["frame"]): item for item in prediction.get("frames", [])}
    errors = {name: [] for name in "HCT"}
    misses = 0
    false_selections = 0
    verified_recovery = 0
    for label in held_out:
        item = guessed.get((label["clip"], label["frame"]))
        truth = label["points"]
        body_length = math.dist((truth["H"]["x"], truth["H"]["y"]),
                                (truth["T"]["x"], truth["T"]["y"]))
        if body_length < 2:
            raise ValueError("Invalid reviewed H/T span")
        if not item or not item.get("points"):
            misses += 1
            continue
        for name in "HCT":
            point = item["points"].get(name)
            if not point:
                continue
            error = math.dist((point["x"], point["y"]),
                              (truth[name]["x"], truth[name]["y"])) / body_length
            errors[name].append(error)
            if name == "C" and error > .5:
                false_selections += 1
        verified_recovery += bool(item.get("verifiedRecovery"))
    return {"model": prediction.get("model"), "heldOutFrames": len(held_out),
            "missingFrames": misses, "centerFalseSelectionsOverHalfBody": false_selections,
            "verifiedRecoveryFrames": verified_recovery,
            "medianErrorBodyLengths": {name: round(statistics.median(values), 4) if values else None
                                       for name, values in errors.items()},
            "coverage": {name: round(len(values) / len(held_out), 4) for name, values in errors.items()}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("reviewed", type=Path)
    parser.add_argument("predictions", nargs="+", type=Path)
    args = parser.parse_args()
    labels = json.loads(args.reviewed.read_text())
    print(json.dumps([score(labels, json.loads(path.read_text())) for path in args.predictions], indent=2))


if __name__ == "__main__":
    main()
