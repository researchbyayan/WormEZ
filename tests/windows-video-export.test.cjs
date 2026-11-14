const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');

test('Windows edit export retries H.264 with OpenH264 and records the encoder', async t => {
    if (process.platform !== 'win32') return t.skip('Windows encoder pipeline');
    const childProcess = require('node:child_process');
    const originalSpawn = childProcess.spawn;
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'wormez-h264-edit-'));
    t.after(async () => { childProcess.spawn = originalSpawn; await fs.rm(temp, { recursive: true, force: true }); });

    const calls = [];
    childProcess.spawn = (_executable, args) => {
        const child = new EventEmitter();
        child.stderr = new PassThrough();
        child.kill = () => {};
        calls.push(args);
        setImmediate(async () => {
            const encoder = args[args.indexOf('-c:v') + 1];
            if (encoder === 'libopenh264') await fs.writeFile(args.at(-1), 'simulated playable H.264 output');
            child.emit('close', encoder === 'h264_mf' ? 1 : 0);
        });
        return child;
    };

    const handlers = new Map();
    const mainFrame = {};
    const source = path.join(temp, 'source.mp4');
    await fs.writeFile(source, 'fixture');
    const { pathToFileURL: toUrl } = require('node:url');
    const root = path.resolve(__dirname, '..');
    const sender = {
        id: 7, mainFrame,
        getURL: () => toUrl(path.join(root, 'WormEZ.html')).href,
        send() {}, once() {}, removeListener() {}
    };
    require('../electron/video-edit-service.cjs')({
        ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
        app: { getPath: () => temp },
        BrowserWindow: { fromWebContents: () => ({}) },
        dialog: {}, toolPath: () => 'ffmpeg.exe', root,
        runTool: async (name, args) => name === 'ffprobe'
            ? { stdout: JSON.stringify(args.some(arg => arg.includes('codec_name'))
                ? { streams: [{ codec_name: 'h264', pix_fmt: 'yuv420p' }] }
                : { streams: [{ codec_type: 'video', width: 640, height: 480, duration: '10' }], format: { duration: '10' } }) }
            : Promise.reject(new Error(`Unexpected tool: ${name}`))
    });

    const result = await handlers.get('wormez:edit-video')({ sender, senderFrame: mainFrame }, {
        source, recipe: { fps: 30, start: 0, end: 30, rotate: 90, flipH: true }
    });
    assert.deepEqual(calls.map(args => args[args.indexOf('-c:v') + 1]), ['h264_mf', 'libopenh264']);
    assert.ok(calls[1].includes('yuv420p'));
    const manifest = JSON.parse(await fs.readFile(result.files[0].path + '.wormez-edit.json', 'utf8'));
    assert.equal(manifest.encoder, 'libopenh264');
    assert.equal(manifest.segments[0].encoder, 'libopenh264');
});

test('bundled OpenH264 produces a decodable H.264 MP4 with rotated dimensions', async t => {
    if (process.platform !== 'win32') return t.skip('Windows bundled FFmpeg');
    const { execFileSync } = require('node:child_process');
    const root = path.resolve(__dirname, '..');
    const ffmpeg = path.join(root, 'electron', 'bin-win', 'ffmpeg.exe');
    const ffprobe = path.join(root, 'electron', 'bin-win', 'ffprobe.exe');
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'wormez-h264-playback-'));
    t.after(() => fs.rm(temp, { recursive: true, force: true }));
    const output = path.join(temp, 'rotated.mp4');
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=320x240:r=30:d=1', '-vf', 'transpose=clock,hflip', '-an', '-c:v', 'libopenh264', '-b:v', '2M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
    const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,pix_fmt', '-of', 'json', output], { encoding: 'utf8' }));
    assert.deepEqual(((s) => [s.codec_name, s.width, s.height, s.pix_fmt])(probe.streams[0]), ['h264', 240, 320, 'yuv420p']);
    execFileSync(ffmpeg, ['-v', 'error', '-i', output, '-f', 'null', '-']);
});
