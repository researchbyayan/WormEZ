const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { _electron } = require('playwright');

test('Windows Electron exports playable edits and keeps window controls working', async t => {
    if (process.platform !== 'win32') return t.skip('Windows Electron smoke test');
    const root = path.resolve(__dirname, '..');
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'wormez-windows-smoke-'));
    const ffmpeg = path.join(root, 'electron', 'bin-win', 'ffmpeg.exe');
    const ffprobe = path.join(root, 'electron', 'bin-win', 'ffprobe.exe');
    const input = path.join(temp, 'source.mp4');
    const outputDir = path.join(temp, 'Edited Videos');
    await fs.mkdir(outputDir);
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=320x240:r=30:d=2', '-an', '-c:v', 'libopenh264', '-b:v', '2M', '-pix_fmt', 'yuv420p', input]);

    let app;
    t.after(async () => { if (app) await app.close().catch(() => {}); await fs.rm(temp, { recursive: true, force: true }); });
    app = await _electron.launch({
        executablePath: path.join(root, 'electron', 'node_modules', 'electron', 'dist', 'electron.exe'),
        args: [path.join(root, 'electron'), `--user-data-dir=${path.join(temp, 'profile')}`],
        env: { ...process.env, WORMEZ_EDIT_DIR: outputDir, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' }
    });
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => { errors.push(`Unexpected dialog: ${dialog.message()}`); void dialog.dismiss(); });
    await page.waitForFunction(() => !!window.wormezDesktop?.editVideo, { timeout: 30000 });
    assert.equal(await page.title(), 'WormEZ');

    const result = await page.evaluate((source) => window.wormezDesktop.editVideo(source, {
        fps: 30, start: 0, end: 30, rotate: 90, flipH: true
    }), input);
    assert.equal(result.files.length, 1);
    const edited = result.files[0].path;
    const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_name,pix_fmt,width,height', '-of', 'json', edited], { encoding: 'utf8' }));
    assert.deepEqual(((s) => [s.codec_name, s.pix_fmt, s.width, s.height])(probe.streams[0]), ['h264', 'yuv420p', 240, 320]);
    const sidecar = JSON.parse(await fs.readFile(edited + '.wormez-edit.json', 'utf8'));
    assert.ok(['h264_mf', 'libopenh264'].includes(sidecar.encoder));

    const playback = await page.evaluate(async url => {
        const video = document.createElement('video');
        video.muted = true;
        video.src = url;
        document.body.appendChild(video);
        await new Promise((resolve, reject) => { video.oncanplay = resolve; video.onerror = () => reject(new Error(`Video element error ${video.error?.code}`)); });
        await video.play();
        await new Promise(resolve => setTimeout(resolve, 250));
        const state = { width: video.videoWidth, height: video.videoHeight, currentTime: video.currentTime, paused: video.paused };
        video.pause();
        video.remove();
        return state;
    }, result.files[0].url);
    assert.deepEqual([playback.width, playback.height], [240, 320]);
    assert.ok(playback.currentTime > 0 && !playback.paused, JSON.stringify(playback));

    const controls = await app.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        return { visible: win.isVisible(), minimizable: win.isMinimizable(), maximizable: win.isMaximizable(), closable: win.isClosable() };
    });
    assert.deepEqual(controls, { visible: true, minimizable: true, maximizable: true, closable: true });
    await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setSize(1100, 750); win.center(); });
    await page.evaluate(() => window.wormezDesktop.setMaximized(true));
    assert.equal((await page.evaluate(() => window.wormezDesktop.windowState())).maximized, true);
    const minimized = await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.minimize(); return win.isMinimized(); });
    assert.equal(minimized, true);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].restore());
    await page.evaluate(() => window.wormezDesktop.setMaximized(false));
    assert.equal((await page.evaluate(() => window.wormezDesktop.windowState())).maximized, false);
    assert.deepEqual(errors, []);
});
