# Vendored browser dependencies

All runtime dependencies load locally; no CDN is required.

| Dependency | Version | Source | License |
|---|---|---|---|
| OpenCV.js (embedded WebAssembly, single file) | 4.13.0 | https://docs.opencv.org/4.13.0/opencv.js | Apache-2.0; `OpenCV-LICENSE.txt` |
| MP4Box | 2.4.1 | npm package `mp4box` | BSD-3-Clause; `MP4Box-LICENSE.txt` |
| Vitrio (workspace glass accents) | 0.1.2 | https://github.com/eamonliu/vitrio | MIT; bundled locally through Vite |
| ExcelJS | 4.4.0 | Existing vendored distribution | MIT, embedded in distribution |
| jsPDF | 2.5.2 | Existing vendored distribution | MIT, embedded in distribution |
| Lexend (UI typeface, variable) | 5.x | npm `@fontsource-variable/lexend` | SIL OFL 1.1; `fonts/Lexend-OFL.txt` |
| FFmpeg / ffprobe (Electron, Intel macOS) | 9.0.2 | Official source release | LGPL-2.1-or-later; `electron/bin/COPYING.LGPLv2.1` |
| libvpx source (prepared, not linked) | 1.15.2 | WebM project source release | BSD-style; source hash recorded in `electron/bin/BUILD.txt` |

OpenCV SHA-256: `63366510248adf3a7eddf3e793dd825404efb7df3749f4d6f8557c7fa4ca8aa0`.
License source: https://raw.githubusercontent.com/opencv/opencv/4.13.0/LICENSE
License SHA-256: `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`.

MP4Box browser bundle SHA-256: `55599e0f21946746f4a244d7281ee0edad77e38d553c459f70015922ba3aeb82`.
MP4Box license SHA-256: `ebad0332150a08f37389158289d93ab2f70b0ee8717d1db9b3d002febc6c5047`.

FFmpeg source SHA-256: `8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e`.
The packaged build disables networking and GPL components. Its exact configure
command is stored in `electron/bin/BUILD.txt`. Conversion first tries H.264
VideoToolbox and then falls back to native MPEG-4 MP4.

Playwright 1.63.0, its Chromium build, and esbuild 0.28.2 are development-only
dependencies pinned by `package-lock.json`. Reinstall with `npm ci` and
`npx playwright install chromium`. `npm run build:mp4` regenerates the local MP4Box
browser bundle; the shipped application never contacts npm or a CDN.

## Local Petri dish segmentation (2026-11-08)

User-supplied moldez_dish_finder/4 weights, model page MIT; exported dataset CC BY 4.0.
No OnePetri source or weights copied. Runtime: segmentation-models-pytorch 0.5.0 (MIT),
torchvision 0.17.2 (BSD), existing PyTorch 2.2.2 (BSD), timm 0.9.16 (Apache 2.0),
Pillow 10.4.0 (HPND). Exact direct pins: tapir-helper/requirements-dish.txt.
Configuration and provenance: tapir-helper/models/README.md. Inference is offline
and CPU-only; no runtime downloads or API keys.

## PhotoCraft selection references, November 2026

https://github.com/storytold/photocraft, MIT license, copyright 2026 ArtCraft Team and PhotoCraft contributors. Selection algorithms reviewed in `references/photocraft/`; license shipped as `PhotoCraft-LICENSE.txt`. `selection.js` / `selection-editor.js` are local JavaScript implementations for binary reference-area masks, magic-wand flood selection, rectangle/ellipse/lasso and boolean combinations. No Rust runtime, GPU editor, model assets or runtime network access added. Exact pixel area is independent of the green overlay's display opacity.
