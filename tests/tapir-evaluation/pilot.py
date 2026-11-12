import argparse
import json
import os
import sys
import time

import cv2
import numpy as np
import torch

source = os.environ.get('TAPNET_SOURCE')
if not source:
    raise RuntimeError('Set TAPNET_SOURCE to the cloned google-deepmind/tapnet directory')
sys.path.insert(0, source)
from tapnet.torch import tapir_model


def run(args):
    torch.set_num_threads(4)
    trace = json.load(open(args.trace))
    cap = cv2.VideoCapture(args.video)
    frames = []
    crops = []
    for _ in range(args.frames):
        ok, bgr = cap.read()
        if not ok:
            break
        crop = bgr[args.y:args.y + args.size, args.x:args.x + args.size]
        if crop.shape[:2] != (args.size, args.size):
            raise ValueError('crop is outside video frame')
        crops.append(crop)
        rgb = cv2.cvtColor(cv2.resize(crop, (256, 256)), cv2.COLOR_BGR2RGB)
        frames.append(rgb)
    cap.release()
    if not frames:
        raise RuntimeError('No frames decoded')

    start = time.monotonic()
    # Official TAPIR (not BootsTAPIR) checkpoint uses one pyramid level less
    # and has no additional convolutional backbone.
    model = tapir_model.TAPIR(pyramid_level=0, extra_convs=False)
    state = torch.load(args.checkpoint, map_location='cpu', weights_only=True)
    model.load_state_dict(state)
    model.eval()
    load_s = time.monotonic() - start

    seed_x = args.seed_x if args.seed_x is not None else trace[0]['x']
    seed_y = args.seed_y if args.seed_y is not None else trace[0]['y']
    q = torch.tensor([[[0.0, (seed_y - args.y) * 256 / args.size,
                        (seed_x - args.x) * 256 / args.size]]], dtype=torch.float32)
    video = torch.from_numpy(np.stack(frames)).float().unsqueeze(0) / 255 * 2 - 1
    with torch.no_grad():
        output = model(video, q)
    infer_s = time.monotonic() - start - load_s
    xy = output['tracks'][0, 0].detach().numpy() * args.size / 256
    occlusion = output['occlusion'][0, 0].detach()
    expected = output['expected_dist'][0, 0].detach()
    visible = ((1 - torch.sigmoid(occlusion)) *
               (1 - torch.sigmoid(expected)) > 0.5).numpy()

    result = []
    for i, (point, vis) in enumerate(zip(xy, visible)):
        px, py = float(point[0] + args.x), float(point[1] + args.y)
        baseline = trace[i]
        result.append({'frame': i, 'tapir_x': px, 'tapir_y': py,
                       'tapir_visible': bool(vis), 'wormez_x': baseline['x'],
                       'wormez_y': baseline['y'], 'wormez_status': baseline['status']})

    for i in range(0, len(crops), max(1, len(crops) // 4)):
        crop = crops[i].copy()
        for j in range(i + 1):
            p = result[j]
            if p['tapir_visible']:
                cv2.circle(crop, (round(p['tapir_x'] - args.x), round(p['tapir_y'] - args.y)),
                           2, (255, 100, 0), -1)
        p = result[i]
        cv2.circle(crop, (round(p['tapir_x'] - args.x), round(p['tapir_y'] - args.y)),
                   5, (255, 100, 0), 2)
        cv2.circle(crop, (round(p['wormez_x'] - args.x), round(p['wormez_y'] - args.y)),
                   5, (0, 0, 255), 2)
        cv2.imwrite(os.path.join(args.output, f'{args.label}-frame{i:03d}.png'), crop)

    delta = []
    for p in result:
        if p['tapir_visible'] and p['wormez_status'] in ('verified', 'manual'):
            dx = (p['tapir_x'] - result[0]['tapir_x']) - (p['wormez_x'] - trace[0]['x'])
            dy = (p['tapir_y'] - result[0]['tapir_y']) - (p['wormez_y'] - trace[0]['y'])
            delta.append(float(np.hypot(dx, dy)))
    summary = {'clip': args.label, 'frames': len(frames), 'checkpoint': 'tapir_checkpoint_panning.pt',
               'crop': [args.x, args.y, args.size], 'model_load_s': round(load_s, 2),
               'inference_s': round(infer_s, 2), 'visible_frames': int(visible.sum()),
               'median_relative_motion_difference_px': round(float(np.median(delta)), 2) if delta else None,
               'note': 'Motion difference compares two algorithms, not biological ground truth.',
               'tracks': result}
    with open(os.path.join(args.output, args.label + '-tapir.json'), 'w') as f:
        json.dump(summary, f, indent=2)
    print(json.dumps({k: v for k, v in summary.items() if k != 'tracks'}, indent=2), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for name in ('video', 'trace', 'label', 'output', 'checkpoint'):
        p.add_argument('--' + name, required=True)
    for name in ('x', 'y', 'size', 'frames'):
        p.add_argument('--' + name, type=int, required=True)
    p.add_argument('--seed-x', type=float)
    p.add_argument('--seed-y', type=float)
    run(p.parse_args())
