# PhotoCraft selection references

Retrieved from https://github.com/storytold/photocraft on 2026-11-09, under its MIT license (included here and in lib/PhotoCraft-LICENSE.txt).

Only selection.rs, combine_mask.rs, marquee.rs, and lasso.rs were downloaded for review. The full Rust editor, GPU compositor, and AI models were not installed.

Used as references for: Replace/Add/Subtract/Intersect modes; four-connected seed-color Magic Wand with channel-level tolerance; rectangular/elliptical marquees; closed freehand lasso masks. WormEZ implements these semantics in small local JavaScript modules. Unlike PhotoCraft's floating coverage/anti-alias masks, WormEZ uses binary source-resolution pixels for measured area. Low-opacity green is display-only and does not change the area count.
