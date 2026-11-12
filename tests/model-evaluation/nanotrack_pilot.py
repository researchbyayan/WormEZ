"""Diagnostic NanoTrack pilot. Existing traces are comparisons, not biological labels.

Weights are supplied in /tmp for this pilot; no search box is shown in the app.
"""
import json
import math
import os
from pathlib import Path
import resource
import sys
import time

import cv2


ROOT = Path(__file__).resolve().parents[2]
CLIPS = [
    ("03-05-2026 da Gal4 x w1118 L4.MP4", "03-05-2026 da Gal4 x w1118 L4"),
    ("03-05-2026 da Gal4 x w1118 L6.MP4", "03-05-2026 da Gal4 x w1118 L6"),
    ("straight final.mp4", "straight final"),
    ("curved final.mp4", "curved final"),
    ("irregular.mp4", "irregular"),
]


def accepted(p):
    return p and p.get("status") in ("verified", "manual", "accepted") and p.get("anatomy")


def bbox_from_anatomy(point, width, height):
    outline = point["anatomy"].get("outline") or []
    if not outline:
        return None
    xs = [p["x"] for p in outline]
    ys = [p["y"] for p in outline]
    padding = max(3, math.hypot(max(xs) - min(xs), max(ys) - min(ys)) * .12)
    x0, y0 = max(0, min(xs) - padding), max(0, min(ys) - padding)
    x1, y1 = min(width, max(xs) + padding), min(height, max(ys) + padding)
    return (int(x0), int(y0), max(2, int(x1 - x0)), max(2, int(y1 - y0)))


def pilot_clip(path, trace_path, backbone, head):
    trace = json.loads(trace_path.read_text())
    video = cv2.VideoCapture(str(path))
    if not video.isOpened():
        raise RuntimeError(f"Could not open {path}")
    count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    by_frame = {p["frame"]: p for p in trace if isinstance(p, dict)}
    targets = [(target, "spread") for target in
               [0, count // 4, count // 2, 3 * count // 4, max(0, count - 61)]]
    gaps = []
    beginning = None
    for frame_number in range(min(count, len(trace))):
        if not accepted(by_frame.get(frame_number)):
            if beginning is None:
                beginning = frame_number
        elif beginning is not None:
            if beginning > 0 and frame_number - beginning <= 60:
                gaps.append((beginning, frame_number, frame_number - beginning))
            beginning = None
    for gap_start, gap_end, _ in sorted(gaps, key=lambda g: g[2], reverse=True)[:3]:
        targets.append((gap_start - 1, f"gap {gap_start}-{gap_end - 1}"))
    windows = []
    for target, kind in targets:
        seeds = [p for p in trace if accepted(p) and target - 24 <= p["frame"] <= target]
        if not seeds:
            windows.append({"target": target, "kind": kind, "status": "no trusted nearby seed"})
            continue
        seed = max(seeds, key=lambda p: p["frame"])
        start = seed["frame"]
        box = bbox_from_anatomy(seed, width, height)
        if not box:
            windows.append({"target": target, "kind": kind, "status": "no contour"})
            continue
        video.set(cv2.CAP_PROP_POS_FRAMES, start)
        ok, frame = video.read()
        if not ok:
            windows.append({"target": target, "kind": kind, "status": "decode failed"})
            continue
        params = cv2.TrackerNano_Params()
        params.backbone = str(backbone)
        params.neckhead = str(head)
        tracker = cv2.TrackerNano_create(params)
        began = time.monotonic()
        tracker.init(frame, box)
        errors, hints, jumps = [], 0, 0
        previous = seed
        for index in range(start + 1, min(count, start + 61)):
            ok, frame = video.read()
            if not ok:
                break
            ok, region = tracker.update(frame)
            if not ok:
                continue
            x, y, w, h = region
            center = (x + w / 2, y + h / 2)
            hints += 1
            # This physical check mirrors the app's one-frame bound for diagnostics.
            length = float(seed["anatomy"].get("length") or max(box[2], box[3]))
            if math.dist(center, (previous["x"], previous["y"])) > .5 * length:
                jumps += 1
            reference = by_frame.get(index)
            if accepted(reference):
                errors.append(math.dist(center, (reference["x"], reference["y"])) / length)
            previous = {"x": center[0], "y": center[1]}
        windows.append({"target": target, "kind": kind, "seed": start, "frames": hints,
                        "seconds": round(time.monotonic() - began, 3),
                        "medianBodyLengthErrorVsTrace": round(sorted(errors)[len(errors)//2], 3) if errors else None,
                        "comparedFrames": len(errors), "physicalJumps": jumps,
                        "status": "diagnostic only"})
    video.release()
    return {"clip": path.name, "frames": count, "windows": windows}


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: nanotrack_pilot.py BACKBONE.onnx HEAD.onnx")
    backbone, head = map(Path, sys.argv[1:])
    if not backbone.is_file() or not head.is_file():
        raise SystemExit("Both NanoTrack weights are required")
    started = time.monotonic()
    result = [pilot_clip(ROOT.parent / filename, ROOT / "tests" / f"trace-{stem}.json", backbone, head)
              for filename, stem in CLIPS]
    output = {"model": "NanoTrackV2", "weightsBytes": backbone.stat().st_size + head.stat().st_size,
              "clips": result, "elapsedSeconds": round(time.monotonic() - started, 3),
              "peakRssMiB": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1048576, 1),
              "warning": "Existing trace is not human-reviewed ground truth; do not promote based on this report."}
    print(json.dumps(output, indent=2))
