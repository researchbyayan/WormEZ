/* Playback, editing and navigation reuse the workspace's existing action owners. */
(function () {
    const api = window.__wormez;
    if (!api)
        return;
    const S = api.state, $ = id => document.getElementById(id), stage = document.querySelector('.stage');
    const edits = document.createElement('aside');
    edits.className = 'video-edit-tools';
    edits.setAttribute('aria-label', 'Video editing tools');
    edits.innerHTML = '<h3>Edit video</h3><button class="btn ghost" data-edit="trim"><i class="fas fa-cut" aria-hidden="true"></i> Trim</button><button class="btn ghost" data-edit="split"><i class="fas fa-columns" aria-hidden="true"></i> Split</button><button class="btn ghost" data-edit="crop"><i class="fas fa-crop-alt" aria-hidden="true"></i> Crop</button><button class="btn ghost" data-edit="rotate"><i class="fas fa-redo" aria-hidden="true"></i> Rotate</button><button class="btn ghost" data-edit="flip"><i class="fas fa-arrows-alt-h" aria-hidden="true"></i> Flip</button>';
    const view = document.createElement('aside');
    view.className = 'video-view-tools';
    view.setAttribute('aria-label', 'View and anchor tools');
    view.innerHTML = '<h3>View & anchors</h3>';
    view.append($('pointerDock'), document.querySelector('.zoom-tools'), document.querySelector('.timeline-anchor-actions'));
    stage.append(edits, view);
    // The view status line ("Tracking unavailable · full frame shown") is status text, so it lives as its own box
    // at the foot of the Edit Video rail rather than inside the view tools.
    // Overlays (H/C/T, Outline, Mask Preview) sit under Edit Video in the left rail, with their own header.
    const overlays = document.querySelector('.display-toggles');
    if (overlays) { const h = document.createElement('h3'); h.className = 'rail-subhead'; h.textContent = 'Overlays'; edits.append(h, overlays); }
    const viewNote = $('viewNote');
    if (viewNote) { viewNote.classList.add('rail-status'); viewNote.setAttribute('role', 'status'); edits.append(viewNote); }
    const analysis = document.querySelector('.analysis-controls');
    analysis.prepend($('undoBtn'), $('redoBtn'));
    const notice=$('workspaceNotice');notice.classList.add('workspace-notice');analysis.after(notice);
    const secondary=document.createElement('div');secondary.className='player-secondary';secondary.id='playerSecondary';
    secondary.append($('playbackSpeed').parentElement,$('resetBtn'),$('expandVideo'));
    document.querySelector('.player-controls').append(secondary);
    $('prevBtn').querySelector('span[aria-hidden]').textContent='−1 frame';
    $('nextBtn').querySelector('span[aria-hidden]').textContent='+1 frame';
    $('playbackSpeed').addEventListener('change', () => { $('playbackSpeed').parentElement.title = 'Playback speed: ' + $('playbackSpeed').selectedOptions[0].textContent; });
    $('playbackSpeed').dispatchEvent(new Event('change'));
    let modal = null;
    function openEditor(mode) {
        if (!S.loaded || S.running || S.preparing || api.workspace.queue.busy)
            return;
        if (api.getPlaybackState().playing)
            $('playBtn').click();
        const clip = S.clipId, sourceFps = S.fps, sourceFrames = S.totalFrames, desktop = window.wormezDesktop, source = S.sourceFile;
        let nativePath = source?.path;
        try {
            if (!nativePath && source instanceof File)
                nativePath = desktop?.nativeVideoPath?.(source);
        }
        catch { }
        let start = 0, end = S.totalFrames, cuts = [], crop = null, drag = null, saving = false, disposed = false, rotate = 0, flipH = false, flipV = false;
        const previous = document.activeElement, dialog = document.createElement('dialog');
        modal = dialog;
        dialog.className = 'video-edit-dialog';
        dialog.setAttribute('aria-labelledby', 'videoEditTitle');
        dialog.innerHTML = '<header><div><h2 id="videoEditTitle">Prepare video</h2><p>The original recording and its analysis stay unchanged.</p></div><button class="btn icon" data-action="close" aria-label="Close video editor"><i class="fas fa-times" aria-hidden="true"></i></button></header><div class="edit-tabs" role="group" aria-label="Video editing mode"><button class="btn" data-mode="trim">Trim</button><button class="btn" data-mode="split">Split</button><button class="btn" data-mode="crop">Crop</button><button class="btn" data-mode="rotate">Rotate</button><button class="btn" data-mode="flip">Flip</button></div><div class="edit-preview"><video muted playsinline></video><canvas tabindex="0" aria-label="Crop preview; drag to select, move or resize the crop"></canvas></div><div class="edit-seek"><input type="range" min="0" max="' + (S.totalFrames - 1) + '" step="1" value="' + S.currentFrame + '" aria-label="Edit preview frame"><output data-time></output></div><div class="edit-trim"><div class="trim-handles"><input type="range" data-trim-start aria-label="Trim start frame" min="0" max="'+(S.totalFrames-1)+'" value="0" step="1"><input type="range" data-trim-end aria-label="Trim end frame" min="0" max="'+(S.totalFrames-1)+'" value="'+(S.totalFrames-1)+'" step="1"></div><label>Start frame <input type="number" data-start min="0" max="' + (S.totalFrames - 1) + '" value="0"></label><button class="btn" data-action="start">Set start here</button><label>End frame <input type="number" data-end min="0" max="' + (S.totalFrames - 1) + '" value="' + (S.totalFrames - 1) + '"></label><button class="btn" data-action="end">Set end here</button></div><div data-split><button class="btn" data-action="split">Split at this frame</button><div class="edit-cut-list"></div></div><div data-crop><p class="help">Drag a rectangle, drag inside to move it, or drag a corner to resize. Crop applies to every saved segment.</p><output data-crop-size>Full frame</output><button class="btn" data-action="reset-crop">Reset crop</button></div><div data-rotate><button class="btn" data-action="rotate-left"><i class="fas fa-undo" aria-hidden="true"></i> Rotate left 90°</button><button class="btn" data-action="rotate-right"><i class="fas fa-redo" aria-hidden="true"></i> Rotate right 90°</button><output data-rotate-value>0°</output><button class="btn" data-action="reset-rotate">Reset</button></div><div data-flip><button class="btn" data-action="flip-h" aria-pressed="false"><i class="fas fa-arrows-alt-h" aria-hidden="true"></i> Flip horizontal</button><button class="btn" data-action="flip-v" aria-pressed="false"><i class="fas fa-arrows-alt-v" aria-hidden="true"></i> Flip vertical</button></div><p class="help" data-status role="status"></p><div class="edit-files"></div><footer><button class="btn" data-action="cancel">Cancel</button><button class="btn primary" data-action="save">Save edited copies</button></footer>';
        document.body.append(dialog);
        const video = dialog.querySelector('video'), canvas = dialog.querySelector('canvas'), ctx = canvas.getContext('2d'), slider = dialog.querySelector('input[type=range]'), first = dialog.querySelector('[data-start]'), last = dialog.querySelector('[data-end]'), status = dialog.querySelector('[data-status]'), save = dialog.querySelector('[data-action=save]');
        video.src = $('videoEl').currentSrc || $('videoEl').src;
        canvas.width = $('videoEl').videoWidth;
        canvas.height = $('videoEl').videoHeight;
        function message(text) { if (!disposed)
            status.textContent = text; }
        function draw() {
            if (disposed || video.readyState < 2)
                return;
            const W = $('videoEl').videoWidth, H = $('videoEl').videoHeight, oriented = mode !== 'crop' && (rotate || flipH || flipV);
            // Crop is chosen on the unrotated source; rotation and flips preview the saved orientation.
            const swap = oriented && (rotate === 90 || rotate === 270);
            if (canvas.width !== (swap ? H : W) || canvas.height !== (swap ? W : H)) { canvas.width = swap ? H : W; canvas.height = swap ? W : H; }
            ctx.save();
            if (oriented) { ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1); ctx.rotate(rotate * Math.PI / 180); ctx.translate(-W / 2, -H / 2); }
            ctx.drawImage(video, 0, 0, W, H);
            ctx.restore();
            dialog.querySelector('[data-rotate-value]').textContent = rotate + '°';
            dialog.querySelector('[data-action="flip-h"]').setAttribute('aria-pressed', String(flipH));
            dialog.querySelector('[data-action="flip-v"]').setAttribute('aria-pressed', String(flipV));
            if (mode === 'crop' && crop) {
                ctx.save();
                ctx.fillStyle = '#10182077';
                ctx.beginPath();
                ctx.rect(0, 0, canvas.width, canvas.height);
                ctx.rect(crop.x, crop.y, crop.width, crop.height);
                ctx.fill('evenodd');
                const u = canvas.width / Math.max(1, canvas.clientWidth);
                ctx.strokeStyle = '#6792bd';
                ctx.lineWidth = 1.5 * u;
                ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
                ctx.fillStyle = '#fff';
                for (const [x, y] of [[crop.x, crop.y], [crop.x + crop.width, crop.y], [crop.x, crop.y + crop.height], [crop.x + crop.width, crop.y + crop.height]])
                    ctx.fillRect(x - 3 * u, y - 3 * u, 6 * u, 6 * u);
                ctx.restore();
            }
            dialog.querySelector('[data-time]').textContent = 'Frame ' + slider.value + ' · ' + (Number(slider.value) / S.fps).toFixed(2) + ' s';
            dialog.querySelector('[data-crop-size]').textContent = crop ? crop.width + ' × ' + crop.height + ' px' : 'Full frame';
        }
        video.onloadedmetadata = () => { video.currentTime = Math.min(video.duration - .001, (Number(slider.value) + .5) / sourceFps); };
        video.onloadeddata = draw;
        video.onseeked = draw;
        slider.oninput = () => { video.currentTime = Math.min(video.duration - .001, (Number(slider.value) + .5) / sourceFps); draw(); };
        function renderCuts() { const host = dialog.querySelector('.edit-cut-list'); host.replaceChildren(); for (const frame of cuts) {
            const button = document.createElement('button');
            button.className = 'btn ghost';
            button.textContent = 'Frame ' + frame + ' ×';
            button.setAttribute('aria-label', 'Remove split at frame ' + frame);
            button.onclick = () => { cuts = cuts.filter(f => f !== frame); renderCuts(); };
            host.append(button);
        } }
        function range() { const a = Number(first.value), b = Number(last.value) + 1; if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b > S.totalFrames || b <= a) {
            message('Choose an end frame at or after the start, within the recording.');
            save.disabled = true;
            return false;
        } start = a; end = b;
            const handles=dialog.querySelector('.trim-handles');
            handles.querySelector('[data-trim-start]').value=start;handles.querySelector('[data-trim-end]').value=end-1;
            handles.style.setProperty('--trim-left',100*start/Math.max(1,S.totalFrames-1)+'%');handles.style.setProperty('--trim-right',100*(end-1)/Math.max(1,S.totalFrames-1)+'%');
            cuts = cuts.filter(f => f > start && f < end); renderCuts(); save.disabled = !desktop?.editVideo || !nativePath; message(save.disabled ? 'Saving edited videos requires the current Electron dev app. Preview tools remain available.' : 'Save creates ' + (cuts.length + 1) + ' new clip' + (cuts.length ? 's' : '') + '. No source file is overwritten.'); return true; }
        first.onchange = last.onchange = range;
        const trimStart=dialog.querySelector('[data-trim-start]'),trimEnd=dialog.querySelector('[data-trim-end]');
        trimStart.oninput=()=>{first.value=Math.min(Number(trimStart.value),Number(last.value));slider.value=first.value;slider.oninput();range();};
        trimEnd.oninput=()=>{last.value=Math.max(Number(trimEnd.value),Number(first.value));slider.value=last.value;slider.oninput();range();};
        const actions = { start: () => { first.value = slider.value; range(); }, end: () => { last.value = slider.value; range(); }, split: () => { const frame = Number(slider.value); if (!range())
                return; if (frame <= start || frame >= end) {
                message('Choose a split strictly inside the trimmed range.');
                return;
            } cuts = [...new Set([...cuts, frame])].sort((a, b) => a - b); renderCuts(); message('The recording will be saved as ' + (cuts.length + 1) + ' separate clips.'); }, 'reset-crop': () => { crop = null; draw(); }, 'rotate-left': () => { rotate = (rotate + 270) % 360; draw(); }, 'rotate-right': () => { rotate = (rotate + 90) % 360; draw(); }, 'reset-rotate': () => { rotate = 0; draw(); }, 'flip-h': () => { flipH = !flipH; draw(); }, 'flip-v': () => { flipV = !flipV; draw(); } };
        for (const [name, action] of Object.entries(actions))
            dialog.querySelector('[data-action="' + name + '"]').onclick = action;
        function setMode(next) { mode = next; for (const button of dialog.querySelectorAll('[data-mode]'))
            button.setAttribute('aria-pressed', String(button.dataset.mode === mode)); dialog.querySelector('.edit-trim').hidden = mode !== 'trim'; dialog.querySelector('[data-split]').hidden = mode !== 'split'; dialog.querySelector('[data-crop]').hidden = mode !== 'crop'; dialog.querySelector('[data-rotate]').hidden = mode !== 'rotate'; dialog.querySelector('[data-flip]').hidden = mode !== 'flip'; draw(); canvas.style.cursor = mode === 'crop' ? 'crosshair' : 'default'; draw(); }
        for (const button of dialog.querySelectorAll('[data-mode]'))
            button.onclick = () => setMode(button.dataset.mode);
        function point(event) { const r = canvas.getBoundingClientRect(); return { x: Math.max(0, Math.min(canvas.width, (event.clientX - r.left) / r.width * canvas.width)), y: Math.max(0, Math.min(canvas.height, (event.clientY - r.top) / r.height * canvas.height)) }; }
        canvas.onpointerdown = event => { if (mode !== 'crop' || saving || event.button !== 0)
            return; event.preventDefault(); canvas.setPointerCapture(event.pointerId); const p = point(event), u = 14 * canvas.width / canvas.clientWidth; let corner = null; if (crop)
            for (const [key, x, y] of [['nw', crop.x, crop.y], ['ne', crop.x + crop.width, crop.y], ['sw', crop.x, crop.y + crop.height], ['se', crop.x + crop.width, crop.y + crop.height]])
                if (Math.hypot(p.x - x, p.y - y) < u)
                    corner = key; const moving = crop && !corner && p.x > crop.x && p.x < crop.x + crop.width && p.y > crop.y && p.y < crop.y + crop.height; drag = { p, before: crop ? { ...crop } : null, corner, moving }; };
        canvas.onpointermove = event => {
            if (!drag)
                return;
            const p = point(event), b = drag.before;
            if (drag.moving) {
                crop = { ...b, x: Math.round(Math.max(0, Math.min(canvas.width - b.width, b.x + p.x - drag.p.x))), y: Math.round(Math.max(0, Math.min(canvas.height - b.height, b.y + p.y - drag.p.y))) };
            }
            else {
                const anchor = drag.corner ? { x: drag.corner.endsWith('w') ? b.x + b.width : b.x, y: drag.corner.startsWith('n') ? b.y + b.height : b.y } : drag.p;
                crop = { x: Math.round(Math.min(p.x, anchor.x)), y: Math.round(Math.min(p.y, anchor.y)), width: Math.round(Math.abs(p.x - anchor.x)), height: Math.round(Math.abs(p.y - anchor.y)) };
            }
            draw();
        };
        canvas.onpointerup = () => { if (!drag)
            return; if (crop && (crop.width < 2 || crop.height < 2))
            crop = drag.before; if(crop){crop.width-=crop.width%2;crop.height-=crop.height%2;} drag = null; draw(); };
        canvas.onpointercancel = canvas.onlostpointercapture = () => { if (drag) {
            crop = drag.before;
            drag = null;
            draw();
        } };
        const stopProgress = desktop?.onVideoEditProgress?.(value => message('Saving clip ' + (value.completed + 1) + ' of ' + value.total + ' locally…'));
        function finish() { if (disposed)
            return; disposed = true; clearInterval(watch); stopProgress?.(); video.pause(); video.removeAttribute('src'); video.load(); dialog.close(); dialog.remove(); modal = null; if (previous?.isConnected)
            previous.focus({ preventScroll: true }); }
        async function close() { if (saving) {
            message('Cancelling video preparation…');
            await desktop.cancelVideoEdit();
            return;
        } finish(); }
        dialog.querySelector('[data-action=close]').onclick = close;
        dialog.querySelector('[data-action=cancel]').onclick = close;
        dialog.oncancel = event => { event.preventDefault(); close(); };
        dialog.onkeydown = event => event.stopPropagation();
        save.onclick = async () => { if (saving || !range())
            return; saving = true; for (const input of dialog.querySelectorAll('input,button'))
            if (!['close', 'cancel'].includes(input.dataset.action))
                input.disabled = true; message('Saving edited copies…'); try {
            const result = await desktop.editVideo(nativePath, { fps: S.fps, start, end, cuts, crop, rotate, flipH, flipV });
            if (disposed)
                return;
            if (result.cancelled) {
                message('Cancelled. The original recording is unchanged.');
                return;
            }
            const host = dialog.querySelector('.edit-files');
            host.replaceChildren();
            for (const file of result.files) {
                const button = document.createElement('button');
                button.className = 'btn';
                button.textContent = 'Open ' + file.name;
                button.onclick = () => { if (S.clipId !== clip)
                    return; finish(); api.openWorkspaceFile(file).then(() => { S.workspaceStage = 'setup'; }); };
                host.append(button);
            }
            message('Saved ' + result.files.length + ' edited copies. Open a copy to start a fresh analysis and review its calibration.');
        }
        catch (error) {
            message(error.message);
        }
        finally {
            if (!disposed) {
                saving = false;
                for (const input of dialog.querySelectorAll('input,button'))
                    input.disabled = false;
                save.disabled = !desktop?.editVideo || !nativePath;
            }
        } };
        const watch = setInterval(() => { if (S.clipId !== clip || S.fps !== sourceFps || S.totalFrames !== sourceFrames) {
            if (saving)
                desktop.cancelVideoEdit();
            finish();
        } }, 150);
        dialog.showModal();
        setMode(mode);
        range();
        dialog.querySelector('[data-mode="' + mode + '"]').focus();
    }
    for (const button of edits.querySelectorAll('button[data-edit]'))
        button.onclick = () => openEditor(button.dataset.edit);
    function sync() { for (const button of edits.querySelectorAll('button[data-edit]'))
        button.disabled = !S.loaded || S.running || S.preparing || api.workspace.queue.busy; }
    api.machine.subscribe(sync);
    sync();
})();
