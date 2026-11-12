"""Render model-suggested irregular frames for human inspection.

Usage: python render-hints.py VIDEO POINTS_JSON OUTPUT_PNG
"""
import json
from pathlib import Path
import sys

import cv2
import numpy as np


video_path, points_path, output_path = map(Path, sys.argv[1:4])
points = [p for p in json.loads(points_path.read_text())["points"] if p.get("modelHint")]
if not points:
    raise SystemExit("No model hints in the supplied result")
targets = {p["frame"]: p for p in points}
cap = cv2.VideoCapture(str(video_path))
frames = {}
index = 0
while index <= max(targets):
    ok, frame = cap.read()
    if not ok:
        raise SystemExit(f"Video ended before frame {max(targets)}")
    if index in targets:
        frames[index] = frame
    index += 1
cap.release()

size = 240
panels = []
for frame_number, point in targets.items():
    frame = frames[frame_number]
    hint = point["modelHint"]
    left = max(0, min(frame.shape[1] - size, round(hint["x"] - size / 2)))
    top = max(0, min(frame.shape[0] - size, round(hint["y"] - size / 2)))
    panel = frame[top : top + size, left : left + size].copy()
    hx, hy = round(hint["x"] - left), round(hint["y"] - top)
    ox, oy = round(point["x"] - left), round(point["y"] - top)
    cv2.drawMarker(panel, (hx, hy), (255, 230, 0), cv2.MARKER_CROSS, 18, 2)
    if 0 <= ox < size and 0 <= oy < size:
        cv2.drawMarker(panel, (ox, oy), (0, 0, 255), cv2.MARKER_TILTED_CROSS, 14, 1)
    cv2.rectangle(panel, (0, 0), (size, 28), (15, 15, 15), -1)
    cv2.putText(panel, f"frame {frame_number} | cyan=model red=old", (6, 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)
    panels.append(panel)

columns = 4
rows = (len(panels) + columns - 1) // columns
sheet = np.full((rows * size, columns * size, 3), 35, np.uint8)
for i, panel in enumerate(panels):
    y, x = divmod(i, columns)
    sheet[y * size : (y + 1) * size, x * size : (x + 1) * size] = panel
cv2.imwrite(str(output_path), sheet)
print(f"Rendered {len(panels)} review frames to {output_path}")
