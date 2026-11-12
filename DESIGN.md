# WormEZ Design System

This file sets the rules for how WormEZ looks and behaves in the desktop app (Electron) and in the browser.
Follow it whenever you change the interface. If a rule here and the code disagree, fix the code or change
this file in the same commit.

The design is adapted from ChemEZ (`~/Documents/ChatGPT/ChemEZ`, especially
`docs/blueprints/chat-window-sheet.png` and `frontend/src/chat-layout.css`). Its base is light by default:
neutral, quiet surfaces, glass on the window, and accent colour only where it means something.

Behavior and state ownership are documented in [STATE-MACHINES.md](STATE-MACHINES.md). Use the workspace capability contract for shared actions; keep visual state local to its component.

---

## 1. Where the styles live

| Layer | File | Role |
|---|---|---|
| Legacy page styles | `WormEZ.html` (`<style>` blocks) | Original layout, colour tokens (`--ground`, `--panel`, `--ink`, `--accent`), the `--sans` font stack, the boot screen |
| Design system | `src/ui.css` | Every rule in this document. It is layered: later blocks override earlier ones on purpose |
| React shell | `src/App.tsx`, `src/WorkScrollbar.tsx` | Sidebar, top bar, Settings, scrollbar, window controls |
| Desktop shell | `electron/main.js`, `electron/preload.js` | Transparent window (vibrancy), True Maximize, Esc handling |
| Build output | `dist-ui/wormez-ui.css`, `dist-ui/wormez-ui.js` | Built with `npx vite build`. Never edit these files by hand |

**Rules**
- Every design-system selector starts with `html.react-ui`, so it only applies when the React shell is mounted.
- Desktop-only rules also need `.desktop-app`, which is set when `window.wormezDesktop` exists.
- Theme rules use `html[data-theme="dark"]` / `[data-theme="light"]`. When `data-theme` is missing,
  the System theme is active, so the same rule must also exist inside `@media (prefers-color-scheme: dark)` with
  `:not([data-theme])`.
- Glass-only rules use `html[data-glass="on"]`. The Glass Surfaces switch in Settings controls this attribute.
- Rebuild after every CSS or TSX change (`npx vite build`), then restart the dev app (`cd electron && npm start`).

---

## 2. Typography

### 2.1 Font roles (only three)

| Role | Font | Where |
|---|---|---|
| Interface text | **Lexend** (variable, bundled), then Segoe UI, then system | All text, buttons, inputs, numbers, chart labels |
| Wordmark | **New York italic** (`--serif`) for "Worm" plus the **EZ glyph** (`lib/ez-mark.svg`) | Only the wordmark (sidebar, About) and the boot screen |
| Monospace | `--mono` (`ui-monospace, 'SF Mono', Menlo…`) | Not used in visible UI any more. Section headers moved to Lexend. Keep it for code or diagnostics only |

- Lexend ships in `lib/fonts/lexend-latin-wght-normal.woff2` and `lexend-latin-ext-wght-normal.woff2`.
  The licence is `lib/fonts/Lexend-OFL.txt`, recorded in `lib/DEPENDENCIES.md`. The app never loads fonts from the network.
- `--sans` is defined in `WormEZ.html`, which wins over the CSS bundle. Change it there:
  `'Lexend', 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`.
- Canvas text (charts, overlays, PDF/Excel chart images) uses `Lexend, "Segoe UI", system-ui, sans-serif`.
  Never use a monospace font in canvas text.
- Numbers use tabular figures (`font-feature-settings: "tnum"`), so values line up as they change.

### 2.2 Type scale

| Token | Size | Use |
|---|---|---|
| `--t-cap` | 11px | Small meta and chips |
| `--t-sm` | 12px | Buttons, field labels, secondary text, list rows |
| `--t-body` | 13px | Body and help text (line-height 1.5) |
| Section header | 12.5px / 600 | Panel and section headings (see 2.3) |
| `--t-value` | 15px | Big readouts (Length, Width, metric values) |
| `--t-title` | 20px | Empty-state title ("Drop a video here") |

- Body weight is 350, buttons 500 and headings 600. Never use 650; it was normalised to 600.
- Do not introduce sizes outside this scale.

### 2.3 Headings and labels: heading case

- **Every heading and button label uses heading case: every word starts with a capital.**
  Examples: "Start Analysis", "Place Anchor", "Scale & Timing", "Analysis Settings", "Window Glass".
- This is done in CSS with `text-transform: capitalize`, so labels that change at runtime
  (Start Analysis → Re-Analyze, Play → Pause) follow it automatically. Write source text in sentence case.
- **Exceptions** keep their own casing (`text-transform: none`): `Excel (.xlsx)`, `Points CSV`,
  anchor rows ("Frame 40 · 00:01.33 · Approved setup anchor"), zoom %, units, symbols.
- Section headers (Anchors, Scale & Timing, Verification, Head · Center · Tail, Analysis Settings, the Results
  card titles and the Settings headings) share one style: Lexend 12.5px, weight 600, letter-spacing .02em,
  `--ink-soft`, heading case. Panel headings keep the small accent square before them.
- Descriptions, help text and field labels ("Scale reference", "Reference length") are sentences,
  not headings. Leave them in sentence case.

### 2.4 Copy

- Keep descriptions to one short line. Remove repeated hints instead of restating them.
- Never repeat a key that the controls already show. For example, the H/C/T legend was removed because the
  Head/Center/Tail buttons carry the colour badges.
- Use a tooltip (`title`) and `aria-label` when a visible label is shortened (Head → "Edit head").

---

## 3. Colour

### 3.1 Ground and surfaces

The window is one ground colour with surfaces on top of it.

| | Light (default) | Dark |
|---|---|---|
| Ground (behind everything) | soft grey `rgb(236,237,237)` (`--glass-tint`) | black `rgb(0,0,0)` (`--glass-tint-dark`) |
| Surfaces: sidebar, top bar, panels, Settings | white `rgb(255,255,255)` (`--surface`) | dark grey `rgb(30,33,36)` (`--surface-dark`, `--panel`) |
| Lines | `--rule` `rgba(20,30,22,.08)`, `--rule-strong` `.14` | white at about 8–12% |

- The default theme is **Light**. A saved "system" value from older builds is migrated to light once
  (`wormez.themeMigrated`). After that, the user's choice (System, Light or Dark) is respected.
- Surfaces are never tinted green. The ground is never pure white.

### 3.2 Accent and meaning colours

| Colour | Value | Means |
|---|---|---|
| Accent green | `--accent` `#3f6b4a` | Primary action (Load Video, Start Analysis, Excel), active and on states |
| System purple | `#7d5ba6` (`ANCHOR_SYSTEM`) | Anything the system proposed: suggested anchors, approved system anchors, the review card |
| User green | `#2e9e5b` (`ANCHOR_USER`) | Anchors the user placed or corrected, and the anchor-placement cursor |
| Motion-model orange | `rgba(194,65,12,.92)` (`MODEL_ESTIMATE`) | TAPIR motion-model estimates (dashed) |
| Straight-line grey | `rgba(100,116,139,.9)` (`STRAIGHT_ESTIMATE`) | Last-resort straight lines between user anchors (dashed) |
| Head blue / centre red / tail green | `#246bff` / `#df3030` / `#22964b` | H / C / T landmarks |

- Accent green appears only on the primary action, on-state toggles and active indicators. Never use it as decoration.
- The purple/green anchor split is fixed: **purple = system, green = user**. It applies to timeline
  markers (purple outline = proposed, purple fill = approved, green fill = user), the colour edge on
  anchor-list rows, the video overlay square and the glass rims (see 5.3).
- The two video rails are always present (also before a clip loads, dimmed to 45% and inactive) and have a **fixed size,
  131 × 468px, in every window size** (like Photoshop's toolbar). They never stretch or shrink; only the video area resizes.
- **Exception: the video tool rails.** The left rail (Edit Video: trim, split, crop) has a very slight red gradient, and the
  right rail (View & Anchors: pan, overlays, framing, zoom, anchor placement) has a very slight blue gradient. Both are
  mostly white (about 9% tint fading to none), with a matching faint border. The tints group tools; they carry no data meaning.
- Never let a colour cast spread across the window. The light layer behind the edge refraction is
  neutral white/grey, never green.

---

## 4. Layout and spacing

Values are from the ChemEZ spec sheet, adapted.

| Token | Value |
|---|---|
| Top bar height | 66px, horizontal padding 22px, fixed, never scrolls |
| Sidebar width | `--sidebar-w` 160px, padding-x 12px, top padding 58px on macOS (traffic lights) |
| Sidebar rows | 40px tall, radius 9px, gap 2px |
| Panel gap | `--gap` 14px, everywhere, in both the side-by-side and stacked layouts |
| Panel padding | 18px sides, 16px bottom |
| Right gutter | 30px of body padding-right, so content clears the scrollbar |

**Rules**
- **Permanent video card (desktop, windows ≥ 1000px):** the video card is always **800px wide** (136px rail + 514 × 468px
  video + 136px rail) and never resizes. Windows ≥ 1334px (e.g. maximized) put the panels beside it, taking all the remaining
  width; narrower windows put the panels underneath in an 800px block, two per row. Margins are 20px on both sides (the
  scrollbar overlays). The desktop window's minimum width is 1000px so the card always fits. Below 1000px (browser only)
  the layout flows to fit.
- **The video is never squeezed by a shrinking window.** From 1200px windows up the layout is side by side: grid `minmax(0,1fr) clamp(300px, 28vw, 380px)`. The video card on the left is
  `position: sticky` (top 82px) and **fills the window height** (`100vh − 66px − 40px`, minimum 520px). The video area
  takes the remaining space (no fixed 16:9; the video letterboxes inside it). The panels column on the right
  scrolls with the page. **The right column never scrolls on its own.**
- 940–1199px windows: the video card takes the full width (still filling the window height), and the panels go
  underneath, two per row (`repeat(auto-fit, minmax(300px, 1fr))`), with Analysis Settings spanning both columns.
- Below 940px: one column, the video card at 16:9, and exactly 14px between blocks. Never use negative margins.
- No horizontal page scroll at any width from 940px up. Check 1000, 1300, 1440 and 1700px after layout changes.
- The video controls under the video are **one dock**: the anchor review card, pointer bar, zoom bar and
  timeline/transport sit inside the video card, separated by 1px lines. They are not separate floating cards.
- In the transport row, the "−1 Frame / +1 Frame" labels collapse to icons at 1320px and below, so no
  button wraps onto its own line.
- Sidebar items stay inside the sidebar (`box-sizing: border-box; width: 100%`).

---

## 5. Glass

### 5.1 Window glass

- In the desktop app the window is transparent with macOS vibrancy (`electron/main.js`), and the whole
  window is one glass sheet tinted with the ground colour.
- **Window Glass** (Settings → Appearance) sets the sheet's opacity (`--sidebar-alpha`, 30–100%,
  default 82%, stored as `wormez.sidebarOpacity`). The same value tints the sidebar and top bar
  surfaces, so the whole window fades together. The top bar stays a little more solid
  (`.35 + alpha × .6`) so content scrolling under it stays readable.
- In-app panels are **solid** and are never glass. Only things that float over other content may be
  translucent: the top bar, overlays on the video and the scrollbar thumb.
- Settings is a solid sheet with a soft shadow. It is not glass.

### 5.2 Edge refraction

- vitrio's full-window lens (`WorkspaceGlass` in `App.tsx`) bends a neutral light layer on all four window
  edges. Settings: `scale 14, depth 9, curvature 1.7, chroma .06, blur 6, glow .6, edge 1`.
- The refracting rim is masked to the window edge: solid for 8px, fading out by 30px. A wider rim smears controls.
- It is turned off when Glass Surfaces is off (`data-glass="off"`).

### 5.3 Glass rims on surfaces

A rim is a 1.5px ring drawn with `::after` (gradient plus mask-composite), with the light coming from 135°.
It replaces the flat hairline border on the element.

| Element | Rim colour | Strength |
|---|---|---|
| Panels, video card, Settings | neutral black/white gradient | full |
| White/neutral buttons, inputs, Close, active sidebar row | neutral black/white gradient | 55% (softer, more natural) |
| Green (primary) buttons | green-white gradient | 60% |
| System anchors and the review card | purple gradient | — |
| User anchors | green gradient | — |
| Ghost buttons (Fit Frame, H/C/T…) | neutral | only on hover or when on |
| Icon buttons (zoom −/+, undo, redo, steps) | **none** | — |
| Dropdowns (`select`) | cannot take `::after`, so a bevel outline only | — |

- Rims appear only when `data-glass="on"`. With glass off, every surface uses its plain 1px hairline border.
- In dark mode the neutral rim uses the white-fringe variant.
- Inner bevel on surfaces: a 1px white top highlight, a faint bottom shade and a very faint pink/cyan side
  fringe. Keep it subtle.

---

## 6. Shapes (one value per role)

| Role | Size | Radius |
|---|---|---|
| Text button | 32px tall, 14px padding | fully round (999px) |
| Icon button | 32 × 32 | circle |
| Settings Close | 30 × 30 | circle, cross centred |
| Input, dropdown | 32px tall | 10px |
| Anchor-list row | 32px tall, one line, `…` when too long | 9px |
| Sidebar row | 40px tall | 9px |
| Panel, card, Settings | — | 12px |
| Window outline | 1px | 10px |

- Never mix radii within a role. The consistency check below must show a single value per role.

### 6.1 Buttons

- Three tiers only:
  1. **Primary**: solid accent green, white text. There is at most one per area (Load Video, Start Analysis, Excel).
  2. **Secondary**: surface colour with a hairline or rim, ink text.
  3. **Ghost**: transparent. It gets a background on hover, and a pale green fill with accent text when
     `aria-pressed="true"`.
- No one-off coloured outlines. The purple Set Length button was removed for this reason.
- Disabled buttons keep their own colours at 58% opacity. They never wash out to white.
- Header actions (Load Video / Use Camera) are plain solid buttons in every mode. liquid-glass-react was
  removed because it looked wrong both with glass on and with glass off.
- Every button is a real `<button>` with an accessible name. Icon-only buttons need `aria-label` and `title`.

### 6.2 Dropdowns

- Use `appearance: none` with a custom 10 × 6 chevron: dark `#262b27` in light mode and light `#e8ebe8` in dark mode,
  12px from the right edge. The native arrow disappears on dark backgrounds, so never rely on it.

### 6.3 Disclosure triangle

- `details.adv` (Analysis Settings) uses a CSS triangle: 8px wide, 11px tall, accent colour. It rotates 90° when
  open. Never use the "▸" glyph; it is too small.

---

## 7. Scrolling

- **There is one scrollbar: the work-area overlay** (`src/WorkScrollbar.tsx`), ported from ChemEZ's `ChatScrollbar`.
- Every native scrollbar is hidden (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`).
- Geometry: fixed, 8px from the right, 14px wide. The track spans exactly the content: from the top of the first card
  to the bottom of the last card at full scroll, so it never extends past the last card (such as Analysis Settings)
  and never runs beside the top bar.
- Thumb: 12px wide, widening to 14px on hover. Radius 3px, glass gradient with a hairline rim. Its length is
  60% of proportional, capped at 30% of the track, with a minimum of 28px.
- Visibility: hidden at rest, 64% opacity while scrolling, when the pointer comes within 40px, while dragging,
  or while more content is below. It sleeps 1.2 seconds after the last activity.
- **Jump chevron**: when there is more than 100px below, a ⇊ (`fa-angle-double-down`, 18px band) shows inside the
  thumb. It nudges on hover. Clicking it, or double-clicking the thumb, scrolls smoothly to the bottom.
- The track can be clicked to jump and the thumb can be dragged.

---

## 8. Sidebar

- Contents: the wordmark, "Workspace" and the four stage rows (Load, Review Anchors, Analyze, Results), with
  **Settings** at the bottom. How Analysis Works and Diagnostics were removed. Don't bring them back.
- There is no collapse feature, and the width is fixed.
- Wordmark (`<Wordmark />` in `App.tsx`): "Worm" in New York italic plus the EZ glyph. The glyph is `lib/ez-mark.svg`
  (an SVG of New York italic E and Z with a clear gap: 135/1000 em) used as a CSS mask filled with `currentColor`, so it is dark in light mode and light in dark mode. It sits at 0.74em,
  the cap height. Never type "EZ" in the serif for the wordmark; always use the glyph. Sidebar size 28px, About 32px.
- The tagline box ("Larval Motion Analysis", 6.9px Lexend caps) is exactly the
  same width as the wordmark (about 113px) and centred under it.
- Active row: a soft neutral fill plus a neutral rim (with glass on). There is no pill or slider.
- Busy stage: **the stage's icon blinks** (1.1s, opacity 1 → .25). There is no separate dot.
- Hover preview card: radius 12px, a soft shadow and a 13/600 title. Its footnote is a small grey tag that wraps
  to show its full text and is never cut off with "…".

---

## 9. Window (desktop)

- Thin outline around the whole window: 1px, radius 10px, `rgba(0,0,0,.45)` in light mode and
  `rgba(255,255,255,.55)` in dark mode. It is hidden on the boot screen and never blocks clicks.
- **True Maximize** switch (Settings → Appearance):
  - **On**: the green traffic-light button enters real full screen, with the Dock and menu bar hidden
    (`setFullScreenable(true)`).
  - **Off (default)**: the green button fills the screen's work area and the Dock stays visible.
  - The setting is stored in `userData/window-prefs.json` (`trueMaximize`) and applied before the window shows.
- **Esc** leaves full screen, then a filled or maximized window, and restores the previous bounds.
  It does nothing else when the window is already normal.
- Minimum window size is 940 × 700.

---

## 9b. App icon

- The app icon (`electron/icon-1024.png`, `electron/icon.iconset`) is **not finalized**. Leave it as it is until the
  owner provides the final design. The EZ glyph is for the wordmark only, not the icon.

## 10. Boot and loading

- Before the shell mounts: no old layouts flash. The boot script applies the theme, glass and opacity first, and
  `ui-booting` hides the page.
- The boot screen shows the wordmark: "Worm" in New York italic 40px with the EZ glyph after it
  (`lib/ez-mark.svg`, or `lib/ez-mark-light.svg` in dark mode, since the mask isn't available before the shell loads) with **"Initializing"** under it. Its dots type in
  (`Initializing` → `.` → `..` → `...`, 1.2s loop). Trailing non-breaking spaces keep the word from moving.
- A 10s failsafe removes `ui-booting` if the shell never mounts.
- During the quick scan the video frame shows behind the progress card. It is never a black frame.

---

## 10b. About page

- The order is: the wordmark with the same tagline box as the sidebar ("Larval Motion Analysis") and the version beside it, Developed By (Mohammed Ayan Mahmood), then Research Mentors:
  **Dr. Abu S. Mahfujur (Kafi) Rahman first, Dr. Brett Berke second**. "Kafi" appears once, inside the name. Open Source credits come last.

## 11. Interaction

- **No text selection anywhere** except typing fields (`input`, `textarea`, `contenteditable`). Images,
  canvases and links can't be dragged.
- Anchor placement ✓/× controls appear only while an anchor is pending (`.has-pending-anchor`).
- The review card always asks before analysis: "Is the purple suggestion centered on the larva in this
  frame?" A saved result is restored only if it contains user-approved anchors from the current result key.
- Keyboard: every control is reachable with Tab. Focus rings are a 2px accent outline with a 2px offset.
- Reduced motion: blink, nudge, scrollbar fade and rim transitions turn off under
  `prefers-reduced-motion: reduce`.

---

## 12. Data visualisation colours

- Canvas charts use Lexend for labels. Colours: trajectory red, start/end dots, and blue for head bend.
- The head-bend chart is drawn on a white image, so in dark mode it is inverted (`invert(.9) hue-rotate(180deg)`)
  to stay dark with a blue line.
- Estimate overlays on the video: dark-orange dashed for motion-model estimates, grey dashed for straight-line
  fallbacks, and a faint red dashed line for short visual gaps. Estimates are never drawn like verified movement.

---

## 13. Consistency check (run after UI changes)

1. Build: `npx vite build`, and check the types: `npx tsc --noEmit -p .`
2. Tests: `npm test` (36 tests, including the version sync between page, bridge and package).
3. Launch the dev app (`cd electron && npm start`), load a real clip (for example `../straight final.mp4`) and check:
   - **Shapes**: one radius and height per role (table in section 6).
   - **Fonts**: everything computes to Lexend except the wordmark.
   - **Rims**: every panel has one with glass on, and none with glass off.
   - **Spacing**: 14px between blocks at 1000, 1300, 1440 and 1700px, and no horizontal scroll.
   - **Scrolling**: no element other than the page scrolls, and the overlay spans only the work area.
   - **Themes**: grey ground with white surfaces in light mode, black ground with dark-grey surfaces in dark
     mode, and the outline colour flips.
   - **Heading case** on every heading and button, with the listed exceptions.
4. A Playwright `_electron` script can collect `getComputedStyle` for every visible `button, select,
   input, .panel, .stage-list li` and group them by radius, height, font, rim and blur. Any group with a
   single member is a likely outlier.

---

## 14. Don'ts

- Don't add panels with their own scrollbars, or show any native scrollbar.
- Don't use the serif anywhere except the wordmark and boot screen. Don't use monospace in the UI.
- Don't add green, purple or orange decoration. Those colours carry meaning (section 3.2).
- Don't make panels glass, and don't make Settings glass.
- Don't add a second primary (green) button in the same area.
- Don't leave a button label or heading in sentence case.
- Don't edit `dist-ui/*` by hand, and don't load fonts or scripts from the network.
- Don't reintroduce How Analysis Works, Diagnostics, the sidebar collapse or a sliding active pill.

## 15. Reference calibration

- Scale choices are Petri Dish and Custom Shape. Nominal dish-size presets and BL measurement units are removed.
- Custom Shape drawing is reserved for a later implementation; choosing it does not set a physical scale.
- Petri Dish detection is local and optional. Missing weights, configuration, or runtime are reported in the scale panel.
- Draw a smooth green (`#2e9e5b`) fitted rim, not a jagged segmentation contour. Keep raw mask area separate from the fit.
- A suggested rim is dashed until confirmed. Calibration requires an explicit known diameter or area and user confirmation.
- Reject clipped or significantly tilted dishes for automatic metric calibration until perspective correction is implemented.
- Without calibration, charts and exports use pixels. Internal body-size estimates may still constrain tracking but are not measurement units.

### Reference Interaction And Idle Display

- Manual dish calibration uses at least five well-spread points on the rim, fitted to a smooth ellipse, then explicit confirmation. The user does not need to find the center.
- Analysis progress blurs the source video until View Video is selected, including while paused.
- The optional biology screensaver starts after two minutes of inactivity, cycles 50 individually referenced local facts with typewriter motion, and dismisses on click or Escape. Skip active correction and camera recording. Respect reduced motion; Settings provides a preview and off switch.

## 16. Explicit Analysis Stages

- Start Analysis and Re-analyze run the existing OpenCV forward/backward verification and bounded retry only. Never invoke TAPIR implicitly.
- At results, Recover Gaps explicitly starts local TAPIR on unresolved bounded intervals. Connect Remaining Gaps becomes available only after a recovery attempt, including a missing-helper result.
- Connections are dashed estimates between trusted endpoints (approved anchors or verified gap boundaries), never across unavailable intervals or existing verified movement. Keep original statuses; exclude estimate distance and duration from verified movement totals, cumulative movement, and average speed.
- Starting analysis clears pending pointer edits and correction modes. Preserve approved anchors.
- Avoid video redraws behind the progress curtain. View Video re-enables throttled preview updates. Transfer worker pixel buffers directly without duplicating them; process every frame.
- Area Change is a regular results panel, computed automatically from trusted outlines in short batches. Cache scalar samples across scrubbing, resizing and calibration changes; invalidate on source outline/status changes. Use the same squared selected unit for the chart, current estimate, mean/range and earlier/recent regions. Reset at gaps; never infer body volume.

### Frame Delivery And Reuse

- Moving processing regions cover the existing detection and optical-flow search windows, plus hint/manual-anchor locations. Restore source coordinates before any measurements. Expand when the tracking hypothesis is lost. Do not show a processing box.
- Keep full-source samples at the existing camera-motion checkpoints; never infer camera motion from a cropped/zero-filled background. Direct-file fallback retains the same coordinate and camera checks.
- Share only immutable decoded video frames, never tracking hypotheses. Keep the reusable cache within 32 MiB, conservatively budgeted at four bytes per pixel. Disable it when one frame exceeds that budget. Invalidate on clip, frame rate, dimensions, or decoder fallback.
- Prefetch at most the next frame/decode block per independent reader. Reuse existing bounded decoder buffers instead of creating another video queue. Pause/cancel checkpoints and both-pass verification remain authoritative.
- Electron file pages bootstrap workers from a fixed allowlist of bundled scripts through preload. Do not disable web security or allow arbitrary filesystem paths.
- Retain local edit interval reruns and bounded gap recovery; leave successful outside results intact. Profiles separate read wait, transfer/worker wait, segmentation, optical flow, anatomy, camera checks, and conversion. Concurrent times overlap.

- Native-selected and finalized local files expose local bytes to the demuxer, allowing the same direct decoder as browser File input. Unsupported media still falls back to exact seeking.
- Disable Electron background throttling while scanning, analyzing, recording, or finalizing; restore it when paused or idle. This does not start extra analysis.
- Worker step replies omit unused preview anatomy; complete original anatomy remains in final pass results. Test Electron with an explicit temporary user-data directory so validation cannot overwrite saved sessions.

### Screensaver Editorial Tone

- Use 50 detailed, individually referenced facts with a concrete surprising hook, including human biology. Keep the earlier 200-item collection archived rather than rotating weak trivia. Interleave body and nature entries. Avoid textbook definitions, clickbait, medical advice, and exaggerated survival claims. Keep reference notes in `src/biologyFacts.sources.md`; no runtime requests.

### In-Video Issues

- Show one dismissible, expandable issue surface inside the video workspace instead of a separate panel below it. Keep messages actionable and use the local Font Awesome close icon.
- Use a compact translucent neutral background, a short entrance transition, and reduced-motion support. Choose the video corner that avoids the larva and existing overlay cards; keep the surface within the source view at compact widths. Do not move keyboard focus when an issue appears.

- Keep the newest issue first, pin placement while hovered/focused, and dismiss the screensaver when an issue needs attention. Allow sufficient height for a complete single instruction at compact sizes; longer histories may scroll.

### Adaptive anchor-bounded sections

- Plan up to four sections, or eight for recordings of at least 90 seconds on hardware supporting eight directional passes. Cuts require approved anchors; never invent a section seed. Short or insufficiently anchored recordings retain conventional two-pass verification.
- Bound actual concurrency separately from section count. Each section retains independent forward/backward state and decoders. Share OpenCV runtimes across states to avoid loading one WASM runtime per pass. Reserve memory for the interface, cap estimated tracking allocation, and reduce new work when native available-memory estimates fall.
- On a four-logical-CPU, 8 GB machine, allow at most two CV threads and four live directional passes; lower this under pressure. Browsers without an available-memory signal remain conservative. This is a scheduling estimate, not a hard operating-system memory guarantee.
- Process overlapping context of at least one camera-check interval plus five frames. Reconcile original thresholds, own every source frame exactly once, propagate camera rejections across cuts, and reject conflicting five-frame seam evidence. Retry only bounded disputed intervals. Keep explicit TAPIR recovery separate.

- Production sections require at least four CV threads. The two-thread L6 pilot was slower, so this four-logical-CPU Mac retains conventional passes plus bounded concurrent retries. Test overrides exist only for exercising multiplexed section safety. If native memory sampling fails, treat available memory as unknown, rather than confusing free memory with all available memory.
- Errors are positioned in the video by base HTML styles as well as the React theme. Use one canonical issue surface, repair its parent when reporting, and keep exception text out of the lower status panel. Use sentence case and complete sentences.

### Custom reference selection

- Open the area editor only on request under Custom Shape. Freeze one source frame, keep all mask edits local until explicit confirmation, and preserve the existing calibration on Cancel.
- Rectangle/ellipse/circle/lasso and seed-color Magic wand use source-resolution binary masks. Offer Replace, Add, Subtract and Intersect, with live 0–255 tolerance, contiguous toggle, and budgeted local Undo/Redo. Green display opacity is 46/255 and never changes measured pixel area. Keep packed masks only in the active clip's calibration state; no per-frame mask inference runs.
- Petri detection draws a smooth solid green boundary with no fill. Do not relax full-rim or perspective checks for a demonstration. A positive result on a validation photograph does not establish success on clipped larva recordings.

- Native reference-editor dialogs own their keyboard events. Local Undo/Redo must never reach the main application's history or change calibration mode underneath the editor. Suppress automatic screensaver activation while a native dialog is open; explicit preview remains a separate user action.

### Fluid inspector cards and plain model language

- Card height follows content, including all approved anchor rows. Compact multi-column inspectors reserve measured content height and pack subsequent cards into free space; keep the original DOM/workflow order and one copy of each control. Respond to resize, content changes, and opened disclosures. Desktop's single inspector column stays naturally stacked.
- Public progress, status and pathway descriptions use “motion model”. Keep backend/model names in technical diagnostics and stored provenance where needed for reproducibility.
- Share one progress fraction between compact and expanded status surfaces. Motion-model waiting is indeterminate; completion counters describe the entire recording. Bring the source video into view when starting manual rim selection or reporting an issue outside the current viewport.

### Endpoint review reliability

- A sparse final-frame hit is still only a suggestion. Require independent temporal endpoint support before offering it, including when the nine-frame scan found a silhouette. Do not silently substitute an earlier endpoint when the literal final frame is unresolved.
- Finishing suggestions with a missing boundary opens that frame at full view in placement mode. A confirmed manual point advances to the next missing boundary or Ready. Keep Start disabled until the visible boundaries are approved. Never commit a point while its video seek is pending.

### Scrolling and white-outline feathering

- Ordinary wheel/trackpad motion over the video scrolls the page, so the lower controls remain reachable. Pinch or Ctrl/Command/Option plus wheel zooms around the pointer; the zoom slider remains available.
- Align the display border to a bounded local source-pixel edge search, then smooth it conservatively. Keep its white core crisp and its feather radius constant in screen pixels at every magnification. Display refinement does not overwrite the measured contour, area, centerline, or exports.

## Reference-area selections

- Keep the source frame visible under a green mask at approximately 18% opacity.
- Show black/white dashed selection edges, including holes, with a constant 1.5 CSS-pixel stroke across zoom levels.
- Animate selection edges only in the editor; respect reduced motion. Keep saved-reference edges static.
- Rectangle, ellipse, lasso, and magic wand share Replace/Add/Subtract/Intersect semantics. Shift adds, Alt subtracts, and Shift+Alt intersects.
- Provide local Undo/Redo, Select all, Deselect, and Invert. Empty selections cannot be confirmed. Cancel and interrupted gestures preserve the saved reference.
- Border rendering never changes the selected source-pixel count or calibration.

## Playback bar

- Keep one compact player bar immediately below the video, never over its pixels.
- Reuse the canonical scrubber, Play/Pause, hold-to-step frame buttons, speed selector and fullscreen action.
- Show elapsed and total time; icon-only controls retain accessible labels and tooltips. Play/Pause is centered on the picture, with a glass-styled glyph and no surrounding circle.
- Keep pointer, zoom and analysis actions in separate rows. Fullscreen retains the player bar and hides analysis controls.

## Video workspace tool groups

- Playback order is time, previous frame, Play/Pause, next frame, icon-only speed menu, Reset clip and fullscreen. Reset and Re-analyze require explicit confirmation from their user-facing controls.
- Editing is a separate warm-white tool group; viewing and anchors use a cool-white group. Both stay outside the picture as equal-width vertical rails in windowed and maximized layouts.
- Undo/Redo, analysis and Pause stay together at the bottom. View tools retain their existing action owners and zoom behavior.
- Trim, Split and Crop use an isolated preparation dialog and save separate local clips. Crop coordinates refer to source pixels; split ranges are half-open. A derived clip starts a fresh session and requires calibration review.

The bottom action row never wraps. Its buttons use responsive compact sizing, with horizontal scrolling only when a very narrow viewport cannot fit readable labels.
