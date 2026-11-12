"""Offline validation: pass the user's Roboflow PNG-mask ZIP as the first argument."""
import io
import json
from pathlib import Path
import sys
import time
import zipfile
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tapir-helper'))
import petri_detector as detector

OUTPUT = ROOT / 'tests' / 'petri-evaluation'
OUTPUT.mkdir(exist_ok=True)

def preview(image, result, title):
    image = image.copy()
    draw = ImageDraw.Draw(image)
    for box in result['boxes']:
        e = box['ellipse']
        cs, sn = np.cos(e['angle']), np.sin(e['angle'])
        points = [(e['x']+e['width']/2*np.cos(t)*cs-e['height']/2*np.sin(t)*sn,
                   e['y']+e['width']/2*np.cos(t)*sn+e['height']/2*np.sin(t)*cs)
                  for t in np.linspace(0, 2*np.pi, 300)]
        draw.line(points, fill='white', width=3)
    image.thumbnail((640, 360))
    ImageDraw.Draw(image).text((6, 6), title, fill='#ffbf80')
    return image

rows = []
with zipfile.ZipFile(sys.argv[1]) as archive:
    for name in archive.namelist():
        if not name.startswith(('test/', 'valid/')) or not name.endswith('.jpg'):
            continue
        image = Image.open(io.BytesIO(archive.read(name))).convert('RGB')
        truth = np.asarray(Image.open(io.BytesIO(archive.read(name[:-4]+'_mask.png')))) == 1
        start = time.monotonic()
        predicted = detector.segmentation_mask(image).astype(bool)
        elapsed = time.monotonic()-start
        union = np.logical_or(predicted, truth).sum()
        iou = float(np.logical_and(predicted, truth).sum()/union) if union else None
        result = detector.predict_segmentation(image)
        rows.append({'file': name, 'dish_iou': iou, 'seconds': elapsed, 'complete_rims': len(result['boxes'])})
        if not (OUTPUT / 'test-preview.png').exists() and name.startswith('test/') and result['boxes']:
            preview(image, result, 'Exported test image · fitted rim').save(OUTPUT / 'test-preview.png')

recordings = []
tiles = []
for name in ['03-05-2026 da Gal4 x w1118 L4.MP4', '03-05-2026 da Gal4 x w1118 L6.MP4',
             'straight final.mp4', 'curved final.mp4', 'irregular.mp4']:
    capture = cv2.VideoCapture(str(ROOT.parent / name))
    good, pixels = capture.read()
    capture.release()
    if not good:
        recordings.append({'file': name, 'decode_error': True})
        continue
    image = Image.fromarray(cv2.cvtColor(pixels, cv2.COLOR_BGR2RGB))
    start = time.monotonic()
    result = detector.predict_segmentation(image)
    recordings.append({'file': name, 'frame': 0, 'seconds': time.monotonic()-start, **result})
    tiles.append(preview(image, result, name))
sheet = Image.new('RGB', (1280, 1080))
for index, tile in enumerate(tiles):
    sheet.paste(tile, ((index % 2)*640, (index // 2)*360))
sheet.save(OUTPUT / 'recordings-preview.png')
result = {'model': 'user-supplied moldez_dish_finder/4', 'dataset': rows, 'recordings': recordings}
(OUTPUT / 'results.json').write_text(json.dumps(result, indent=2)+'\n')
for split in ['test/', 'valid/']:
    values = [row['dish_iou'] for row in rows if row['file'].startswith(split)]
    print(split, len(values), 'mean dish IoU', sum(values)/len(values), flush=True)
print('Recording candidates:', [(r['file'], len(r.get('boxes', []))) for r in recordings], flush=True)
