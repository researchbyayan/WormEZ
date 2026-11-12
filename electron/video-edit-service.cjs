const fs = require('fs/promises'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process'), { pathToFileURL } = require('url');
const { plan } = require('./video-edits.cjs');
module.exports = function register({ ipcMain, app, BrowserWindow, dialog, toolPath, runTool, root }) {
    const jobs = new Map();
    function owner(event) { if (!BrowserWindow.fromWebContents(event.sender) || event.senderFrame !== event.sender.mainFrame || event.sender.getURL().split('?')[0] !== pathToFileURL(path.join(root, 'WormEZ.html')).href)
        throw new Error('Video editing is restricted to WormEZ.'); }
    ipcMain.handle('wormez:cancel-video-edit', event => { owner(event); const job = jobs.get(event.sender.id); if (job) {
        job.cancelled = true;
        job.child?.kill('SIGTERM');
    } return true; });
    ipcMain.handle('wormez:edit-video', async (event, { source, recipe }) => {
        owner(event);
        if (jobs.has(event.sender.id))
            throw new Error('A video edit is already running.');
        const job = { cancelled: false, child: null }, outputs = [], artifacts = [];
        jobs.set(event.sender.id, job);
        const destroyed = () => { job.cancelled = true; job.child?.kill('SIGTERM'); };
        event.sender.once('destroyed', destroyed);
        try {
            if (typeof source !== 'string' || !path.isAbsolute(source) || !(await fs.stat(source)).isFile())
                throw new Error('Choose a local video file.');
            const probe = JSON.parse((await runTool('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', source])).stdout), video = probe.streams.find(s => s.codec_type === 'video');
            if (!video)
                throw new Error('No video stream was found.');
            const pieces = plan(recipe, { duration: Number(video.duration || probe.format.duration), width: video.width, height: video.height });
            if (job.cancelled)
                return { cancelled: true, files: [] };
            // Edited copies go to WormEZ's own folder (no prompt). WORMEZ_EDIT_DIR overrides it for tests.
            const folder = process.env.WORMEZ_EDIT_DIR || path.join(app.getPath('userData'), 'Edited Videos');
            await fs.mkdir(folder, { recursive: true });
            const selected = { filePaths: [folder] };
            if (job.cancelled)
                return { cancelled: true, files: [] };
            const base = path.parse(source).name.replace(/[^\w .-]/g, '_'), id = crypto.randomUUID().slice(0, 8);
            for (const [index, piece] of pieces.entries()) {
                if (job.cancelled)
                    throw new Error('Video editing cancelled.');
                const output = path.join(selected.filePaths[0], `${base}-edited-${id}-${index + 1}.mp4`);
                outputs.push(output);
                artifacts.push(output);
                event.sender.send('wormez:video-edit-progress', { completed: index, total: pieces.length });
                const encode = encoder => new Promise((resolve, reject) => {
                    const args = ['-n', '-i', source, '-map', '0:v:0', '-an', '-vf', piece.filters, '-c:v', encoder, ...(encoder === 'h264_videotoolbox' ? ['-allow_sw', '1', '-q:v', '65'] : ['-q:v', '2']), '-fps_mode', 'passthrough', '-movflags', '+faststart', output];
                    let error = '';
                    const child = spawn(toolPath('ffmpeg'), args, { stdio: ['ignore', 'ignore', 'pipe'] });
                    job.child = child;
                    child.stderr.on('data', b => { error = (error + b).slice(-8000); });
                    child.on('error', reject);
                    child.on('close', code => { if(job.child===child)job.child = null; code === 0 ? resolve() : reject(new Error(job.cancelled ? 'Video editing cancelled.' : error.trim().split('\n').slice(-2).join(' ') || 'Video encoding failed.')); });
                });
                try {
                    await encode('h264_videotoolbox');
                }
                catch (error) {
                    await fs.rm(output, { force: true });
                    if (job.cancelled)
                        throw error;
                    await encode('mpeg4');
                }
            }
            if(job.cancelled)throw new Error('Video editing cancelled.');
            const manifest = outputs[0] + '.wormez-edit.json';
            artifacts.push(manifest);
            const sourceStat = await fs.stat(source);
            await fs.writeFile(manifest, JSON.stringify({ version: 1, source: { name: path.basename(source), size: sourceStat.size, lastModified: sourceStat.mtimeMs }, recipe, segments: pieces.map((piece, index) => ({ file: path.basename(outputs[index]), startFrame: piece.start, endFrameExclusive: piece.end })), audioOmitted: true }, null, 2));
            if(job.cancelled)throw new Error('Video editing cancelled.');
            return { files: outputs.map(file => ({ native: true, name: path.basename(file), path: file, url: pathToFileURL(file).href })) };
        }
        catch (error) {
            await Promise.all(artifacts.map(file => fs.rm(file, { force: true }).catch(() => { })));
            if (job.cancelled)
                return { cancelled: true, files: [] };
            throw error;
        }
        finally {
            event.sender.removeListener('destroyed', destroyed);
            jobs.delete(event.sender.id);
        }
    });
};
