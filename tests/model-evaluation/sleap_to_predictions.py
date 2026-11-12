"""Map cropped SLEAP H/C/T predictions back to source-frame coordinates.

Output remains a model suggestion. WormEZ's contour, motion, and two-pass
checks would have to accept it before any frame could count as verified.
"""
import argparse
import json
import math
from pathlib import Path


def convert(labels, transforms):
    by_index = {frame.frame_idx: frame for frame in labels}
    frames = []
    for index, transform in enumerate(transforms):
        frame = by_index.get(index)
        selected = max(frame.instances, key=lambda inst: inst.score, default=None) if frame else None
        points = None
        if selected is not None:
            xy = selected.numpy()
            names = selected.skeleton.node_names
            if all(name in names for name in ("head", "center", "tail")):
                points = {}
                for name, short in (("head", "H"), ("center", "C"), ("tail", "T")):
                    x, y = xy[names.index(name)]
                    if math.isfinite(x) and math.isfinite(y):
                        points[short] = {"x": float((x - transform["tx"]) / transform["scale"]),
                                         "y": float((y - transform["ty"]) / transform["scale"])}
                if len(points) != 3:
                    points = None
        frames.append({"clip": transform["clip"], "frame": transform["frame"],
                       "points": points, "verifiedRecovery": False})
    return {"model": "SLEAP H/C/T suggestion", "frames": frames}


def main():
    import sleap_io as sio

    parser = argparse.ArgumentParser()
    parser.add_argument("predictions", type=Path, help="SLEAP .slp prediction file")
    parser.add_argument("transforms", type=Path, help="test-transforms.json from make_sleap_trial.py")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    labels = sio.load_slp(str(args.predictions))
    transforms = json.loads(args.transforms.read_text())
    args.output.write_text(json.dumps(convert(labels, transforms), indent=2))
    print(args.output)


if __name__ == "__main__":
    main()
