"""Isolated official LocoTrack-S comparison; does not affect WormEZ results."""
import argparse
import json
import os
import sys
import time

import cv2
import numpy as np
import torch


def main(args):
    torch.set_num_threads(4)
    sys.path.insert(0, os.path.join(args.source, 'locotrack_pytorch'))
    from models.locotrack_model import load_model
    trace = json.load(open(args.trace))
    cap = cv2.VideoCapture(args.video)
    frames, crops = [], []
    for _ in range(args.frames):
        ok, bgr = cap.read()
        if not ok:
            break
        crop = bgr[args.y:args.y + args.size, args.x:args.x + args.size]
        if crop.shape[:2] != (args.size, args.size):
            raise ValueError('crop outside video frame')
        crops.append(crop)
        frames.append(cv2.cvtColor(cv2.resize(crop, (256, 256)), cv2.COLOR_BGR2RGB))
    cap.release()
    seed_x = args.seed_x if args.seed_x is not None else trace[0]['x']
    seed_y = args.seed_y if args.seed_y is not None else trace[0]['y']
    query = torch.tensor([[[0.0, (seed_y - args.y) * 256 / args.size,
                            (seed_x - args.x) * 256 / args.size]]], dtype=torch.float32)
    video = torch.from_numpy(np.stack(frames)).float()[None] / 255 * 2 - 1
    start = time.monotonic()
    model = load_model(ckpt_path=args.checkpoint, model_size='small').eval()
    load_s = time.monotonic() - start
    with torch.no_grad():
        output = model(video, query)
    inference_s = time.monotonic() - start - load_s
    positions = output['tracks'][0, 0].numpy() * args.size / 256
    visible = (((1 - torch.sigmoid(output['occlusion'])) *
                (1 - torch.sigmoid(output['expected_dist']))) > 0.5)[0, 0].numpy()
    os.makedirs(args.output, exist_ok=True)
    results = []
    for i, (xy, vis) in enumerate(zip(positions, visible)):
        results.append({'frame': i, 'x': float(xy[0] + args.x), 'y': float(xy[1] + args.y),
                        'visible': bool(vis), 'wormez_x': trace[i]['x'],
                        'wormez_y': trace[i]['y'], 'wormez_status': trace[i]['status']})
    for i in range(0, len(crops), max(1, len(crops) // 4)):
        crop = crops[i].copy()
        for p in results[:i + 1]:
            if p['visible']:
                cv2.circle(crop, (round(p['x'] - args.x), round(p['y'] - args.y)), 2, (255, 0, 200), -1)
        p = results[i]
        cv2.circle(crop, (round(p['x'] - args.x), round(p['y'] - args.y)), 5, (255, 0, 200), 2)
        cv2.circle(crop, (round(p['wormez_x'] - args.x), round(p['wormez_y'] - args.y)), 5, (0, 0, 255), 2)
        cv2.imwrite(os.path.join(args.output, f'{args.label}-locotrack-frame{i:03d}.png'), crop)
    summary = {'clip': args.label, 'frames': len(frames), 'checkpoint': 'locotrack_small.ckpt',
               'seed_source_px': [seed_x, seed_y], 'model_load_s': round(load_s, 2),
               'inference_s': round(inference_s, 2), 'visible_frames': int(visible.sum()),
               'note': 'Visibility is a model judgment, not biological ground truth.', 'tracks': results}
    with open(os.path.join(args.output, args.label + '-locotrack.json'), 'w') as f:
        json.dump(summary, f, indent=2)
    print(json.dumps({k: v for k, v in summary.items() if k != 'tracks'}, indent=2), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for name in ('video', 'trace', 'label', 'output', 'checkpoint', 'source'):
        p.add_argument('--' + name, required=True)
    for name in ('x', 'y', 'size', 'frames'):
        p.add_argument('--' + name, type=int, required=True)
    p.add_argument('--seed-x', type=float)
    p.add_argument('--seed-y', type=float)
    main(p.parse_args())
