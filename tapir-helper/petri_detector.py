"""Offline CPU dish segmentation with user-supplied weights and confirmed rim fitting."""
import base64
import importlib.util
import io
from pathlib import Path
import threading
import json
import os
os.environ.setdefault("HF_HUB_OFFLINE", "1")

MODEL_DIR = Path(__file__).parent / 'models'
_seg_model = None
_lock = threading.Lock()
PT_PATH = MODEL_DIR / 'weights.pt'
CONFIG_PATH = MODEL_DIR / 'petri-config.json'

def segmentation_config():
    if not CONFIG_PATH.is_file():
        raise ValueError('Dish weights found. Class mapping and preprocessing configuration are still required.')
    cfg = json.loads(CONFIG_PATH.read_text())
    if cfg.get('architecture') != 'deeplabv3plus' or cfg.get('encoder') != 'mobilenet_v2':
        raise ValueError('Unsupported segmentation architecture')
    if cfg.get('classes') != 3 or cfg.get('dish_class') not in (0, 1, 2):
        raise ValueError('A verified dish class index is required')
    size = cfg.get('input_size', [])
    if len(size) != 2 or any(not isinstance(v, int) or v < 32 or v > 2048 or v % 32 for v in size):
        raise ValueError('Training input size must contain two multiples of 32')
    if cfg.get('resize') != 'stretch' or len(cfg.get('mean', [])) != 3 or len(cfg.get('std', [])) != 3 or any(v <= 0 for v in cfg['std']):
        raise ValueError('Verified RGB normalization and stretch preprocessing are required')
    return cfg

def status():
    if PT_PATH.is_file():
        try: segmentation_config()
        except (ValueError, OSError) as error: return {'available': False, 'reason': str(error)}
        if importlib.util.find_spec('segmentation_models_pytorch') is None:
            return {'available': False, 'reason': 'Local segmentation runtime not installed'}
        return {'available': True, 'backend': 'PyTorch CPU segmentation'}
    return {'available': False, 'reason': 'Petri dish model not installed'}

def predict(payload):
    state = status()
    if not state['available']:
        raise ValueError(state['reason'])
    from PIL import Image
    import numpy as np
    raw = base64.b64decode(payload.get('image', ''), validate=True)
    if len(raw) > 8 * 1024 * 1024:
        raise ValueError('Calibration image is too large')
    image = Image.open(io.BytesIO(raw)).convert('RGB')
    width, height = image.size
    if width * height > 20_000_000:
        raise ValueError('Calibration image dimensions are too large')
    return predict_segmentation(image)

def segmentation_mask(image):
    global _seg_model
    import torch
    import segmentation_models_pytorch as smp
    import numpy as np
    import cv2
    cfg = segmentation_config()
    width, height = image.size
    resized = image.resize(tuple(cfg['input_size']))
    if cfg.get('grayscale'): resized = resized.convert('L').convert('RGB')
    pixels = np.asarray(resized, dtype=np.float32) / 255
    pixels = (pixels - np.asarray(cfg['mean'], dtype=np.float32)) / np.asarray(cfg['std'], dtype=np.float32)
    with _lock:
        if _seg_model is None:
            torch.set_num_threads(4)
            model = smp.DeepLabV3Plus(encoder_name=cfg['encoder'], encoder_weights=None, classes=3)
            checkpoint = torch.load(PT_PATH, map_location='cpu', weights_only=True)
            model.load_state_dict({k.removeprefix('model.'): v for k, v in checkpoint['state_dict'].items()}, strict=True)
            _seg_model = model.eval()
        model = _seg_model
        with torch.inference_mode():
            labels = model(torch.from_numpy(pixels.transpose(2, 0, 1).copy())[None]).argmax(1)[0].numpy()
    mask = cv2.resize((labels == cfg['dish_class']).astype(np.uint8), (width, height), interpolation=cv2.INTER_NEAREST)
    return mask

def predict_segmentation(image):
    import cv2
    import numpy as np
    width, height = image.size
    mask = segmentation_mask(image)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    boxes = []
    reasons = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < width * height * .1 or len(contour) < 20:
            reasons.append('No full dish-sized region was found. Use a frame that shows the whole dish.')
            continue
        (cx, cy), (a, b), angle = cv2.fitEllipse(contour)
        if min(a, b) / max(a, b) < .65 or abs(np.pi*a*b/4-area)/area > .15: continue
        x, y, w, h = cv2.boundingRect(contour)
        if x <= 1 or y <= 1 or x+w >= width-1 or y+h >= height-1:
            reasons.append('The dish boundary is cropped. Choose a frame showing the whole dish or mark a known diameter manually.')
            continue
        component = np.zeros_like(mask)
        cv2.drawContours(component, [contour], -1, 1, cv2.FILLED)
        raw_area = int(np.count_nonzero(mask & component))
        boxes.append({'x': x, 'y': y, 'width': w, 'height': h, 'raw_mask_area': raw_area,
                      'ellipse': {'x': cx, 'y': cy, 'width': a, 'height': b, 'angle': angle * np.pi / 180}})
    return {'boxes': boxes, 'width': width, 'height': height, 'reason': reasons[0] if reasons and not boxes else ''}
