const { app, BrowserWindow, session, shell, ipcMain, dialog, nativeTheme, screen } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const {pathToFileURL}=require('url');
const crypto=require('crypto');
const {spawn}=require('child_process');

app.setName('WormEZ');
const devProfile=app.commandLine.getSwitchValue('user-data-dir');
if(!app.isPackaged&&devProfile)app.setPath('userData',path.resolve(devProfile));
const screensaverWindows=new Set();
ipcMain.on('wormez:screensaver-active',(event,active)=>{if(active===true)screensaverWindows.add(event.sender.id);else screensaverWindows.delete(event.sender.id);});
// Electron's dev-only security-warning scan throws on file:// pages; it never runs in packaged builds.
if(!app.isPackaged)process.env.ELECTRON_DISABLE_SECURITY_WARNINGS='true';

// True maximize: fill the display's whole work area (not macOS zoom), remembering the windowed bounds.
const windowPrefsPath=()=>path.join(app.getPath('userData'),'window-prefs.json');
function readWindowPrefs(){try{return JSON.parse(require('fs').readFileSync(windowPrefsPath(),'utf8'));}catch{return {};}}
function writeWindowPrefs(prefs){try{require('fs').writeFileSync(windowPrefsPath(),JSON.stringify(prefs));}catch{}}
const restoreBounds=new WeakMap();
function isTrueMaximized(win){const wa=screen.getDisplayMatching(win.getBounds()).workArea,b=win.getBounds();return Math.abs(b.x-wa.x)<2&&Math.abs(b.y-wa.y)<2&&Math.abs(b.width-wa.width)<2&&Math.abs(b.height-wa.height)<2;}
function trueMaximize(win){if(win.isFullScreen())win.setFullScreen(false);if(!isTrueMaximized(win))restoreBounds.set(win,win.getBounds());win.setBounds(screen.getDisplayMatching(win.getBounds()).workArea,true);}
function trueRestore(win){const b=restoreBounds.get(win);if(b)win.setBounds(b,true);else{win.setSize(1360,920,true);win.center();}}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 920,
    minWidth: 1000, // sidebar 160 + 20 + fixed 800px video card + 20
    minHeight: 700,
    backgroundColor: process.platform==='darwin'?'#00000000':'#f6f5f0',
    ...(process.platform==='darwin'?{titleBarStyle:'hidden',trafficLightPosition:{x:20,y:20},transparent:true,vibrancy:'under-window',visualEffectState:'active'}:{}),
    title: 'WormEZ',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  if(process.platform==='darwin')win.setVibrancy(nativeTheme.prefersReducedTransparency?null:'hud');
  const page=app.isPackaged?path.join(process.resourcesPath,'app','WormEZ.html'):path.join(__dirname,'..','WormEZ.html');
  win.loadFile(page);
  const contentsId=win.webContents.id;
  win.webContents.on('did-start-loading',()=>screensaverWindows.delete(contentsId));
  win.on('closed',()=>screensaverWindows.delete(contentsId));
  // True maximize on: the green button enters real full screen (Dock and menu bar hidden).
  // Off: it zooms to fill the work area with the Dock still visible.
  win.setFullScreenable(!!readWindowPrefs().trueMaximize);
  // Esc leaves full screen (or a maximized/zoomed window) and returns to the normal windowed size.
  // Only consumed when it changes the window, so Esc still closes dialogs and cancels modes otherwise.
  let videoFullscreen=false;
  win.on('enter-html-full-screen',()=>{videoFullscreen=true;});
  win.on('leave-html-full-screen',()=>{videoFullscreen=false;});
  win.webContents.on('before-input-event',(event,input)=>{
    if(input.type!=='keyDown'||input.key!=='Escape'||input.alt||input.control||input.meta||input.shift)return;
    if(screensaverWindows.has(win.webContents.id)){event.preventDefault();win.webContents.send('wormez:dismiss-screensaver');return;}
    if(videoFullscreen)return;
    if(win.isFullScreen()){event.preventDefault();win.setFullScreen(false);}
    else if(win.isSimpleFullScreen?.()){event.preventDefault();win.setSimpleFullScreen(false);}
    else if(isTrueMaximized(win)&&restoreBounds.has(win)){event.preventDefault();trueRestore(win);}
    else if(win.isMaximized()){event.preventDefault();win.unmaximize();}
    else if(isTrueMaximized(win)){event.preventDefault();trueRestore(win);}
  });
  win.webContents.setWindowOpenHandler(({url}) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return {action:'deny'};
  });
  win.webContents.on('will-navigate',(event,url)=>{
    if(!url.startsWith('file://'))event.preventDefault();
  });
}

ipcMain.handle('wormez:resource-capacity',async event=>{if(!BrowserWindow.fromWebContents(event.sender)||event.senderFrame!==event.sender.mainFrame)return null;return require('./resource-capacity.cjs')();});

ipcMain.on('wormez:analysis-active',(event,active)=>{const win=BrowserWindow.fromWebContents(event.sender);if(win&&event.senderFrame===event.sender.mainFrame)event.sender.setBackgroundThrottling(!active);});

// Fixed local scripts only; no arbitrary file path is accepted from the renderer.
let trackingWorkerSource=null;
ipcMain.handle('wormez:tracking-worker-source',async event=>{
  const owner=BrowserWindow.fromWebContents(event.sender),root=app.isPackaged?path.join(process.resourcesPath,'app'):path.join(__dirname,'..');
  if(!owner||event.senderFrame!==event.sender.mainFrame||event.sender.getURL().split('?')[0]!==pathToFileURL(path.join(root,'WormEZ.html')).href)throw new Error('Tracking workers are restricted to the WormEZ workspace');
  trackingWorkerSource??=Promise.all(['opencv-4.13.0.js','anatomy.js','tracking.js','pass-core.js','pass-worker.js'].map(name=>fs.readFile(path.join(root,'lib',name),'utf8'))).then(sources=>sources.map(source=>source.replace(/^importScripts\([^\n]*\);$/m,'')).join('\n;\n')).catch(error=>{trackingWorkerSource=null;throw error;});
  return trackingWorkerSource;
});

ipcMain.handle('wormez:open-video', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{name:'Video recordings',extensions:['mp4','mov','m4v','webm','avi','mkv','wmv','mts','m2ts','ts','mpg','mpeg','3gp']}] });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  return {name:path.basename(filePath),path:filePath,url:pathToFileURL(filePath).href};
});

ipcMain.handle('wormez:open-folder',async event=>{
  const root=app.isPackaged?path.join(process.resourcesPath,'app'):path.join(__dirname,'..');
  if(!BrowserWindow.fromWebContents(event.sender)||event.senderFrame!==event.sender.mainFrame||event.sender.getURL().split('?')[0]!==pathToFileURL(path.join(root,'WormEZ.html')).href)throw new Error('Folder selection is restricted to WormEZ');
  const result=await dialog.showOpenDialog({properties:['openDirectory']});if(result.canceled)return null;
  const folder=result.filePaths[0],files=[];
  async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full);else if(entry.isFile()&&/\.(mp4|mov|m4v|webm|avi|mkv|wmv|mts|m2ts|ts|mpg|mpeg|3gp)$/i.test(entry.name)){const stat=await fs.stat(full);files.push({native:true,name:entry.name,path:full,url:pathToFileURL(full).href,relativePath:path.relative(folder,full).split(path.sep).join('/'),size:stat.size,lastModified:stat.mtimeMs});}}}
  await walk(folder);return files;
});

const recordings=new Map();
ipcMain.handle('wormez:capture-begin',async(_event,{mimeType})=>{const id=crypto.randomUUID(),dir=path.join(app.getPath('temp'),'WormEZ-recordings');await fs.mkdir(dir,{recursive:true});const ext=String(mimeType).includes('mp4')?'mp4':'webm',filePath=path.join(dir,`wormez-${Date.now()}-${id}.${ext}`);await fs.writeFile(filePath,Buffer.alloc(0));recordings.set(id,{path:filePath,name:path.basename(filePath),mimeType});return{id};});
ipcMain.handle('wormez:capture-append',async(_event,{id,data})=>{const rec=recordings.get(id);if(!rec)throw new Error('Recording session is no longer active');await fs.appendFile(rec.path,Buffer.from(data));return{written:data.byteLength};});
ipcMain.handle('wormez:capture-finish',async(_event,{id})=>{const rec=recordings.get(id);if(!rec)throw new Error('Recording session is no longer active');recordings.delete(id);return{name:rec.name,path:rec.path,url:pathToFileURL(rec.path).href,mimeType:rec.mimeType};});
ipcMain.handle('wormez:capture-cancel',async(_event,{id})=>{const rec=recordings.get(id);if(!rec)return{cancelled:false};recordings.delete(id);await fs.rm(rec.path,{force:true});return{cancelled:true};});

// Bundled tools: electron/bin (macOS) or electron/bin-win (Windows, fetched by scripts/fetch-ffmpeg-win.cjs); packaged builds put either in resources/bin.
function toolPath(name){const exe=process.platform==='win32'?name+'.exe':name;return app.isPackaged?path.join(process.resourcesPath,'bin',exe):path.join(__dirname,process.platform==='win32'?'bin-win':'bin',exe);}
function runTool(name,args){return new Promise((resolve,reject)=>{const child=spawn(toolPath(name),args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',()=>reject(new Error(`${name} is unavailable in this build`)));child.on('close',code=>code===0?resolve({stdout,stderr}):reject(new Error(stderr.trim()||`${name} failed with code ${code}`)));});}
ipcMain.handle('wormez:probe-video',async(_event,{path:filePath})=>JSON.parse((await runTool('ffprobe',['-v','error','-show_streams','-show_format','-of','json',filePath])).stdout));
ipcMain.handle('wormez:convert-video',async(_event,{path:filePath})=>{
  const dir=path.join(app.getPath('temp'),'WormEZ-converted');
  await fs.mkdir(dir,{recursive:true});
  const base=path.join(dir,`${path.parse(filePath).name}-${Date.now()}`);
  const attempts=[
    process.platform==='win32'?{backend:'h264_mf',output:`${base}.mp4`,args:['-map','0:v:0','-an','-c:v','h264_mf','-b:v','8M','-movflags','+faststart']}:{backend:'h264_videotoolbox',output:`${base}.mp4`,args:['-map','0:v:0','-an','-c:v','h264_videotoolbox','-allow_sw','1','-q:v','45','-movflags','+faststart']},
    {backend:'mpeg4_fallback',output:`${base}-fallback.mp4`,args:['-map','0:v:0','-an','-c:v','mpeg4','-q:v','3','-movflags','+faststart']}
  ];
  const errors=[];
  for(const attempt of attempts){
    try{
      await runTool('ffmpeg',['-y','-i',filePath,...attempt.args,attempt.output]);
      return{name:path.basename(attempt.output),path:attempt.output,url:pathToFileURL(attempt.output).href,backend:attempt.backend};
    }catch(error){
      errors.push(`${attempt.backend}: ${error.message}`);
      await fs.rm(attempt.output,{force:true}).catch(()=>{});
    }
  }
  throw new Error(`Local conversion failed. ${errors.join(' | ')}`);
});

ipcMain.handle('wormez:save-file', async (_event, {suggestedName,data}) => {
  const result = await dialog.showSaveDialog({defaultPath:suggestedName});
  if (result.canceled || !result.filePath) return {saved:false};
  await fs.writeFile(result.filePath,Buffer.from(data));
  return {saved:true,path:result.filePath};
});

// Motion-model (TAPIR) helper: started on demand from the project's tapir-helper runtime when it is installed.
const TAPIR_URL='http://127.0.0.1:8765';
let tapirChild=null,tapirStarting=null;
function tapirRoot(){return app.isPackaged?path.join(process.resourcesPath,'app'):path.join(__dirname,'..');}
async function tapirGet(){const r=await fetch(TAPIR_URL+'/tapir/status');if(!r.ok)throw new Error('helper status '+r.status);return r.json();}
async function ensureTapir(){
  try{return await tapirGet();}catch{}
  if(!tapirStarting)tapirStarting=(async()=>{
    const root=tapirRoot(),python=path.join(root,'tapir-helper','.venv','bin','python');
    try{await fs.access(python);}catch{return {available:false,reason:'Motion model runtime is not installed'};}
    tapirChild=spawn(python,[path.join(root,'tapir-helper','server.py')],{cwd:root,stdio:'ignore'});
    tapirChild.on('exit',()=>{tapirChild=null;tapirStarting=null;});
    for(let i=0;i<150;i++){await new Promise(r=>setTimeout(r,200));try{return await tapirGet();}catch{}}
    return {available:false,reason:'Motion model helper did not start'};
  })();
  const status=await tapirStarting;if(!status.available)tapirStarting=null;return status;
}
ipcMain.handle('wormez:petri-status',async()=>{await ensureTapir();const r=await fetch(TAPIR_URL+'/petri/status');return r.json();});
ipcMain.handle('wormez:petri-detect',async(_e,body)=>{await ensureTapir();const r=await fetch(TAPIR_URL+'/petri/detect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error||'Dish detection failed');return result;});
ipcMain.handle('wormez:tapir-status',()=>ensureTapir().catch(e=>({available:false,reason:e.message})));
ipcMain.handle('wormez:tapir-track',async(_e,body)=>{
  const r=await fetch(TAPIR_URL+'/tapir/track',{method:'POST',headers:{'Content-Type':'application/json'},body});
  return {ok:r.ok,result:await r.json()};
});
app.on('will-quit',()=>{if(tapirChild)tapirChild.kill();});

ipcMain.handle('wormez:window-state',e=>{const win=BrowserWindow.fromWebContents(e.sender);const prefs=readWindowPrefs();return {maximized:!!win&&isTrueMaximized(win),trueMaximize:!!prefs.trueMaximize};});
ipcMain.handle('wormez:window-true-maximize',(e,on)=>{writeWindowPrefs({...readWindowPrefs(),trueMaximize:!!on});const win=BrowserWindow.fromWebContents(e.sender);if(win){if(!on&&win.isFullScreen())win.setFullScreen(false);win.setFullScreenable(!!on);}return !!on;});
ipcMain.handle('wormez:window-maximize',(e,on)=>{const win=BrowserWindow.fromWebContents(e.sender);if(!win)return false;if(on)trueMaximize(win);else trueRestore(win);return isTrueMaximized(win);});

// Updates (ported from ChemEZ): weekly prompt; Windows installs on restart, Mac downloads the DMG and opens it.
const releaseInfo=require('./release-info.cjs').createReleaseInfo({app});
const updater=require('./updater.cjs').createUpdater({app,shell,releaseInfo,send:value=>{for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('wormez:update',value);}});
ipcMain.handle('wormez:update-download',()=>updater.download());
ipcMain.handle('wormez:update-install',()=>updater.install());

app.whenReady().then(() => {
  updater.start();
  const allowed=(webContents,permission,details)=>permission==='media'&&webContents.getURL().startsWith('file:')&&(!details?.mediaTypes||details.mediaTypes.every(type=>type==='video'));
  session.defaultSession.setPermissionCheckHandler((webContents,permission,_origin,details)=>!!webContents&&allowed(webContents,permission,details));
  session.defaultSession.setPermissionRequestHandler((webContents,permission,callback,details)=>callback(allowed(webContents,permission,details)));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

require('./video-edit-service.cjs')({ipcMain,app,BrowserWindow,dialog,toolPath,runTool,root:app.isPackaged?path.join(process.resourcesPath,'app'):path.join(__dirname,'..')});
