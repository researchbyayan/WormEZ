"""Offline, loopback-only TAPIR hint service for WormEZ.

TAPIR returns point motion, never verified larval measurements. The browser
re-runs its existing segmentation and two-pass checks around these hints.
"""

import base64
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
import threading
import petri_detector

import cv2
import numpy as np
import torch


ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(MODEL_DIR / "vendor"))
from tapnet.torch import tapir_model  # noqa: E402

HOST = "127.0.0.1"
PORT = 8765
MODEL = None
MODEL_LOCK = threading.Lock()
MAX_BODY = 24 * 1024 * 1024
MAX_FRAMES = 120


def get_model():
    global MODEL
    if MODEL is None:
        checkpoint = MODEL_DIR / "tapir_checkpoint_panning.pt"
        if not checkpoint.is_file():
            raise FileNotFoundError("Bundled TAPIR checkpoint is missing")
        torch.set_num_threads(4)
        model = tapir_model.TAPIR(pyramid_level=0, extra_convs=False)
        model.load_state_dict(torch.load(checkpoint, map_location="cpu", weights_only=True))
        MODEL = model.eval()
    return MODEL


def predict(payload):
    images = payload.get("frames")
    seeds = payload.get("seeds")
    if not isinstance(images, list) or not 2 <= len(images) <= MAX_FRAMES:
        raise ValueError("A TAPIR interval must contain 2–120 consecutive frames")
    if not isinstance(seeds, list) or not 2 <= len(seeds) <= 5:
        raise ValueError("Two to five seed points on the larva are required")
    query = []
    for seed in seeds:
        if not isinstance(seed, list) or len(seed) != 2 or not all(isinstance(v, (int, float)) and 0 <= v < 256 for v in seed):
            raise ValueError("Seed coordinates must be inside the 256-pixel crop")
        query.append([0.0, float(seed[1]), float(seed[0])])  # TAPIR uses t, y, x.
    decoded = []
    for encoded in images:
        if not isinstance(encoded, str) or len(encoded) > 250_000:
            raise ValueError("Invalid encoded frame")
        raw = base64.b64decode(encoded, validate=True)
        image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
        if image is None or image.shape[:2] != (256, 256):
            raise ValueError("Each frame must be a 256×256 JPEG")
        decoded.append(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    video = torch.from_numpy(np.stack(decoded)).float()[None] / 255 * 2 - 1
    with MODEL_LOCK, torch.no_grad():
        output = get_model()(video, torch.tensor([query], dtype=torch.float32))
    positions = output["tracks"][0].detach().cpu().numpy()
    visibility = ((1 - torch.sigmoid(output["occlusion"])) *
                  (1 - torch.sigmoid(output["expected_dist"])) > 0.5)[0].detach().cpu().numpy()
    return {"positions": positions.tolist(), "visible": visibility.tolist()}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def allowed(self):
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin", "")
        return (host in (f"{HOST}:{PORT}", f"localhost:{PORT}") and
                (not origin or origin in (f"http://{HOST}:{PORT}", f"http://localhost:{PORT}")) and
                self.headers.get("Sec-Fetch-Site", "same-origin") in ("same-origin", "none"))

    def json(self, status, body):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self.allowed():
            self.send_error(403)
        elif self.path == "/petri/status":
            self.json(200, petri_detector.status())
        elif self.path == "/tapir/status":
            self.json(200, {"available": (MODEL_DIR / "tapir_checkpoint_panning.pt").is_file(),
                            "maxFrames": MAX_FRAMES, "purpose": "search hints only"})
        else:
            target = Path(self.translate_path(self.path)).resolve()
            permitted = (target == ROOT / "WormEZ.html" or
                         target.is_relative_to(ROOT / "lib") or
                         target.is_relative_to(ROOT / "dist-ui"))
            if not permitted:
                self.send_error(404)
                return
            super().do_GET()

    def do_POST(self):
        if not self.allowed() or self.path not in ("/tapir/track", "/petri/detect"):
            self.send_error(403)
            return
        try:
            count = int(self.headers.get("Content-Length", "0"))
            if count <= 0 or count > MAX_BODY:
                raise ValueError("Interval data exceeds the 24 MB limit")
            payload = json.loads(self.rfile.read(count))
            self.json(200, petri_detector.predict(payload) if self.path == "/petri/detect" else predict(payload))
        except (ValueError, json.JSONDecodeError) as exc:
            self.json(400, {"error": str(exc)})
        except Exception as exc:
            self.json(500, {"error": f"Local inference failed: {exc}"})


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"WormEZ TAPIR helper: http://{HOST}:{PORT}/WormEZ.html", flush=True)
    server.serve_forever()
