# WormEZ state ownership audit

This inventory covers app-owned behavior in the renderer, Electron bridge and local helper. Third-party decoder, model and UI internals are outside this boundary. A row is an independent lifecycle or interaction: several can be active together. The session can have valid results while the user is seeking, editing calibration, or inspecting a dialog.

The decision is to make ownership, allowed actions and cancellation explicit before migrating more UI. Replacing the whole engine with a single reducer would mix unrelated lifecycles, change well-tested numerical paths and duplicate large frame/track objects. `lib/workspace-state.js` is a small projection of existing owners with a guarded action boundary. It does not own pixels, saved measurements, OpenCV state or native processes. The React shell subscribes to that projection instead of running a second polling loop. A single legacy synchronization tick remains for fields that still mutate directly.

## Inventory

| Machine | States and transition triggers | Current owner and migration decision |
|---|---|---|
| App bootstrap | Booting → legacy runtime ready → React mounted → reveal; load failures stay diagnosable | `WormEZ.html` boot script, `src/main.tsx`, `src/App.tsx`. Keep initialization order; desktop and browser share the same source. |
| Source selection | Empty/current source → browser picker, drop, or native picker → selected/cancelled/error | `WormEZ.html` load handlers. Native picker identity is separate from committed media identity; cancelling a dialog does not replace the video. |
| Local conversion | Selected unsupported file → first encoder → fallback encoder → converted/error | Renderer `chooseNativeVideo`, `electron/main.js` conversion IPC. The latest source intent alone may commit a conversion. An obsolete native conversion may still finish in the background; process cancellation and temp-file retention are separate work. |
| Media opening | Pending metadata → duration resolution → loaded → scan or restored session; decode failure | `beginLoad`, `loadedmetadata`, `pendingLoad`, `pendingWorkspaceSession`. Metadata belongs to the pending clip and URL; reset/replacement invalidates it. |
| Workspace and navigation | Videos / Setup / Analyze / Results; loading, scanning, reviewing, ready, running, paused, error are independent engine phases | `setWorkflow`, `guided-workspace.js`, `src/workflow.ts`. Snapshot supplies the phase and the page; React renders a projection and rejects older clip/job IDs. Compatibility mapping handles saved `analyze` pages. |
| Sidebar stage previews | Closed → hover/focus preview → expanded or dismissed | `App.tsx` preview state. Local UI only; never use it as tracking readiness. |
| Camera acquisition | Closed → permission pending → stream attached → preview or error | `openCamera` and source-intent epoch. Late permission responses release their own stream and cannot replace a newer video. |
| Recording | Preview → starting recorder → recording → finalizing → load recorded clip, cancel or fail | Renderer `MediaRecorder`, camera session, chunk write chain; native `recordings` map and capture IPC. Finalization must retain session identity through each await. Camera device/disk failure coverage remains a native validation task. |
| Provisional camera tracking | Idle → sample frame → provisional candidate or rejection → next sample; stops with stream | `sampleCamera` and recording timer. Never a completed fit; a delayed runtime response checks its stream before using pixels. |
| Video transport | Paused / native playback / clock-driven high-speed preview / seeking / ended | `pauseVideo`, `configurePlaybackSpeed`, playback clock, media events. Viewing speed does not alter analysis FPS. Snapshot distinguishes playing from seeking. |
| Frame-step hold | Idle → immediate step → hold delay → repeat → pointer-up/cancel/blur | Frame buttons and their timer pair in `WormEZ.html`. Keep separate from playback rate. |
| View framing | Fit frame / follow larva / whole pathway; manual zoom/pan or automatic framing | View mode, zoom, offsets and view rectangle in `WormEZ.html`. Display-only; pointer corrections temporarily save and restore the viewport. |
| Pointer gesture | Idle → captured pointer → tap, drag/pan or pinch → released/cancelled | Canvas pointer map, interaction mode, drag state and pinch baseline. Physics and viewport are independent. Keep existing coordinate and gesture tests. |
| Anchor review | Suggested frame → seek → approve, fix, unavailable, next/back, or finish | Proposal list, index, selected frame and `showProposalReview`. Saved anchors, hollow suggestions and active scrubber remain separate. Commands enforce exact frame and seek readiness. |
| Visible boundaries and unavailable ranges | No boundary / one boundary / ready; range start → scrub end → confirm/remove | `boundaryReady`, unavailable draft and intervals. Readiness comes from actual visible approved anchors, not the stage label. |
| Anchor transaction | Navigate → place/fix → pending point → save/cancel; frame change invalidates draft | Pointer mode, pending point, edit frame and saved viewport. Cancel (including Escape before a point exists) returns to review and restores view. Scrubbing cancels rather than committing an old point. |
| Landmark correction | H/C/T mode → choose location → head proposal/approval or saved endpoint → reorientation/refit | `landmarkMode`, `headProposal`, head/tail seeds. Center correction can refit an interval; endpoint identity changes reuse tracking. Separate from body-center placement. |
| Reference calibration | No reference → Petri/custom → geometry + known size → calibrated; invalid geometry stays uncalibrated | `scaleConfig`, `mmPerPixel`, `lib/scale.js`, inspector controls. No body-length scale. Unit changes recalculate measurements only. |
| Dish detection and rim editing | Idle → detector pending → suggestion/error; manual rim points → fit → confirm/discard | `dishRequest`, frame/clip checks, scale draft and suggestion. A suggestion is not calibration until confirmed with a valid known size. |
| Custom area editor | Closed → rectangle/ellipse/lasso/wand → draft selection → replace/add/subtract/intersect → save/cancel | `lib/selection-editor.js`; separate bounded mask undo/redo history. Modal ownership excludes a new analysis command until the dialog closes. |
| Analysis job | Idle → starting → running → paused/resumed → complete/cancelled/failed | `WormTracker.Job`, `activeJob`, `runVerification`, clip/job checkpoints. Named pause/resume/stop actions are shared with the controls. Repeated Start cannot create another job. |
| Parallel pass scheduling | Queued → worker acquisition → initialized pass → processing → merge/retry → disposed | `lib/parallel.js`, `pass-core.js`, `pass-worker.js`, reader pool. Worker-local hypotheses remain independent. The contract exposes ownership, not internal CV objects. |
| Decoder | Uninitialized → direct block decode/cache or exact seek → read/prefetch → fallback or dispose | `lib/mp4-reader.js`, `frame-reader.js`, `makeAnalysisReader`. Late indexing checks its job before writing the current clip's decoder. |
| Progress and attention | Hidden / displayed / video revealed; working/paused/stopped/error; alert locked/unlocked | Progress panel, curtain, ETA counters and Web Audio; same job remains active when view is revealed. Keep view state separate from cancellation. |
| Gap recovery | Uncertain → explicit motion-model check → accepted/suggested/unresolved → explicit straight estimate | `recoverWithTapir`, `lib/tapir-recovery.js`, model guidance and fallback flag. Neither request automatically promotes an estimate to verified data. |
| Local helper | Off → probe/launch → ready → request → model result/failure; cached model initialization | `electron/main.js` helper startup, `Launch WormEZ.command`, `tapir-helper/server.py` and `petri_detector.py`. Keep model and process ownership outside the workspace renderer. |
| Fit and derived results | Empty/partial → completed fit revision → measurements calculated; dirty fit or changed measurement settings | `captureFit`, `fitSettingsKey`, `guided-workspace.js` calculation. Snapshot distinguishes partial, stale, calculating and ready. Exports are disabled while tracking settings are stale; re-analysis then covers the whole clip. Fit provenance survives save/restore. Undo restores a matching fit from the restored raw track and recalculates instead of re-decoding. |
| Result persistence | Dirty → debounce → queued write → saved/error; lookup → restore or ignore stale lookup | Legacy IndexedDB result queue and separate folder sessions. Existing formats remain readable. Legacy filename+frame-count identity is a remaining collision risk; migrate only with backwards-compatible keys. |
| Session history | Remember → undo/redo → new edit truncates redo; reset/load clears or scopes entries | `historyFields`, `remember`, `restoreHistory`. Snapshots retain fit provenance without adding a duplicate track to each history entry. Draft edits are cancelled when restoring history. |
| Folder queue | Detached/reselect folder → attaching → selecting/reviewing → running/stopping → complete/failure → exporting | `lib/video-batch.js` explicit phase lock. Claim before awaiting storage; bind capture to the selected item and loaded clip. Incomplete fits are not completed rows, and failed rows keep their errors. |
| Multiworm identity | Hidden → future model-assisted count → discovery/assignment → selected individual → per-worm fit/export | `lib/multiworm.js` and the legacy per-worm session map. User-facing discovery remains hidden; this audit does not enable it. |
| Area-change derivation | No eligible track → tokenized scan → ready → scrub synchronized overlay; new fit/reset cancels old scan | `areaView` token and `lib/area-change.js`. Keep separate from the tracking job and never read display feathering as measurement data. |
| Export | Available → build CSV/XLSX/PDF/ZIP → save dialog/download → saved/cancelled/error | Export builders, Electron save IPC, folder export lock. Do not start tracking to generate a report. Existing raw/evidence columns remain unchanged. |
| Error surface | No issue → report/aggregate → expand/read → dismiss | `reportError`, issue list and error panel. Lifecycle error and recoverable issue are different: a reflection warning need not invalidate the whole clip. |
| Settings and focus | Closed → tab selected → preference edit → close/restore focus | `App.tsx`, `useDialogFocus`; theme, glass, sound, opacity and idle-screen preferences are local. Modal focus is independent of source state. |
| Idle facts | Armed → idle delay → visible → type → hold/advance → dismiss/rearm | `BiologyScreensaver.tsx`, native Escape handoff. Respect reduced motion and do not make typing timers part of analysis progress. |
| Responsive panel layout | Wide/compact → resize/mutation queued → layout applied → observer cleanup | `FluidPanels.tsx`. Layout never decides whether an analysis command is valid. |
| Work scrollbar | Unscrollable/asleep → awake → dragging/end → sleep | `WorkScrollbar.tsx`, pointer capture and inactivity timeout. Presentation only. |
| Native window | Windowed/maximized/fullscreen → restore bounds; Escape routed by active surface | `electron/main.js`, native preference file and window callbacks. Do not replace platform state with a renderer boolean. |

## Stable workspace contract

`window.__wormez.machine` is available in both renderer environments. New UI and automation should use this interface rather than writing `window.__wormez.state` or clicking hidden buttons. The existing engine bridge is retained for current tests and internal features.

- `getSnapshot()` returns an immutable, JSON-safe `WorkspaceSnapshot`. `context` identifies clip, job, frame, phase and stage. `regions` show independent lifecycles; `details` include boundary, proposal, revision and history counts. `capabilities[action]` gives `enabled`, a stable reason code and readable explanation. `violations` report inconsistent facts without changing them.
- `subscribe(listener)` fires on changed snapshots and returns an unsubscribe function. Frame reads are current when explicitly requested. The bounded history records region/ownership changes and command outcomes; it does not log every frame or copy raw video.
- `send({type, expected})` invokes a named action and returns `{ok, code, reason?, snapshot}`. Optional `expected` fields are `clipId`, `jobId`, `frame` and `revision`. Use clip/job/frame for an action on a specific review frame; use revision when any semantic change should invalidate it. A stale command is rejected rather than applied to a newer clip or frame. Stop remains available while Start is awaiting completion.
- Supported actions: `analysis.start`, `analysis.pause`, `analysis.resume`, `analysis.stop`, `session.reset`, `anchor.confirm`, `anchor.cancel`, `review.accept`, `review.next`, `review.back`. These invoke the existing analysis and edit functions. `results.export` is a read-only capability. Loading files and writing exports remain existing user-facing operations; they are not added to this command surface.
- `getHistory()` returns a copy of the last 64 diagnostic records. This is local, in-memory debugging data, not telemetry or an undo log.

```js
const machine = window.__wormez.machine;
const state = machine.getSnapshot();
if (state.capabilities['review.accept'].enabled) {
  const {clipId, jobId, frame} = state.context;
  const outcome = await machine.send({type: 'review.accept', expected: {clipId, jobId, frame}});
  console.log(outcome.code, outcome.snapshot.context.frame);
}
```

The runtime projection and guards live in `lib/workspace-state.js`; the shell-facing types live in `src/workspace-contract.ts`. The wiring in `lib/guided-workspace.js` reads the legacy engine once per refresh and supplies the existing engine actions. For a new interaction, first identify its owner, then add a pure capability test and a browser test that exercises the real action. Keep timers, models and rendering behind the owner instead of introducing a second set of flags.

## Deliberate limits

This is not a wholesale conversion to one state machine. Convert additional regions only when there is a concrete transition problem and a regression test for it. The next valuable migrations are an explicit camera start/finalize transaction, fully event-driven legacy rendering, and a versioned migration for result identity/provenance. No tracking thresholds, measurement definitions, UI theme or offline dependencies are changed by the contract. A bounded regression suite cannot prove that every native device and recording behaves identically; see the handoff for what was actually tested.

## Local video preparation

`lib/video-workspace.js` owns a modal edit draft: closed → preview (trim/split/crop) → saving → saved/error/cancelled. Its source clip, FPS and frame count are captured at entry; replacement or timing changes cancel the draft and any active save. Closing releases the preview decoder and progress subscription. The modal blocks new analysis through the existing dialog capability.

The draft never changes source anchors, calibration or tracking results. Save uses `electron/video-edit-service.cjs`, one job per renderer, a native output-folder picker and bounded encoder stderr. Cancellation/window destruction terminates the child encoder; failed jobs remove their own outputs. New clips have separate identities. The sidecar records source identity and half-open source-frame ranges. Reset and re-analysis confirmations live at user-facing button entry points so queue and correction workflows retain their established action owners.
