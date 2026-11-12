import {useDialogFocus} from './useDialogFocus';
import {useEffect,useReducer,useState,useRef} from 'react';
import {Button} from 'glisse';
import LiquidGlass from 'vitrio';
import 'glisse/styles.css';
import {derivePhase,getLegacy,phaseCopy} from './legacy';
import {initialWorkflow,workflowReducer,type WorkflowPhase} from './workflow';
import {WorkScrollbar} from './WorkScrollbar';
import {UpdateCard} from './UpdateCard';
import './ui.css';
import {BiologyScreensaver} from './BiologyScreensaver';
import {FluidPanels} from './FluidPanels';

function statusPhrase(phase:WorkflowPhase,pass?:string){
  if(window.location.protocol==='file:'&&!('wormezDesktop' in window)){
    if(phase==='idle')return 'Open Launch WormEZ.command for automatic gap recovery';
    if(phase==='ready')return 'Model recovery unavailable here · open Launch WormEZ.command';
    if(phase==='results')return 'Review gaps · model recovery needs the local launcher';
  }
  if(phase==='analyzing'){
    if(pass?.startsWith('Motion model')||pass?.startsWith('TAPIR'))return 'Rechecking uncertain movement with model guidance';
    if(pass?.startsWith('Retry'))return 'Retrying an uncertain interval';
    if(pass==='Checking landmarks')return 'Checking body landmarks';
    return 'Tracking anchor intervals and checking problem regions';
  }
  return ({idle:'Load a video or connect a camera to begin',loading:'Opening the video and checking its frames',scanning:'Finding suggested anchors',reviewing:'Confirm boundaries and inspect optional anchors',reviewingBoundary:'Confirm the first and last visible anchors',ready:'Check setup, then start analysis',cameraPreview:'Choose a camera to begin recording',recording:'Recording and tracking provisionally',finalizingRecording:'Saving the recording',paused:'Analysis paused , resume when ready',results:'Review uncertain intervals, then export results',error:'Analysis needs attention , open Diagnostics'} as Record<WorkflowPhase,string>)[phase];
}


type Theme='system'|'light'|'dark';
function preference(key:string,fallback:string){try{return localStorage.getItem(key)||fallback}catch{return fallback}}
function savePreference(key:string,value:string){try{localStorage.setItem(key,value)}catch{}}

function WorkspaceGlass({enabled}:{enabled:boolean}){
  useEffect(()=>{
    if(!enabled||window.matchMedia('(prefers-reduced-transparency: reduce)').matches)return;
    const scene=document.createElement('div');
    scene.className='vitrio-scene';
    scene.setAttribute('aria-hidden','true');
    scene.innerHTML='<span class="glass-light one"></span><span class="glass-light two"></span><span class="glass-light three"></span><span class="glass-streaks"></span>';
    document.body.appendChild(scene);
    const glass=new LiquidGlass({background:scene,draggable:false,zIndex:90,scale:14,depth:9,curvature:1.7,chroma:.06,blur:6,glow:.6,edge:1,tint:0});
    for(const layer of ['.lqg-lens','.lqg-glass']){
      const all=document.querySelectorAll<HTMLElement>(layer);
      all[all.length-1]?.setAttribute('data-surface','wormez-window');
    }
    const align=()=>{glass.set({width:window.innerWidth,height:window.innerHeight,radius:12});glass.moveTo(0,0)};
    align();
    window.addEventListener('resize',align);
    return()=>{window.removeEventListener('resize',align);glass.destroy();scene.remove()};
  },[enabled]);
  return null;
}

/* Wordmark: "Worm" in the serif, then the EZ glyph (lib/ez-mark.svg used as a mask, so it takes the text colour). */
function Wordmark({className=''}:{className?:string}){
  return <span className={'wordmark '+className} role="img" aria-label="WormEZ"><span aria-hidden="true">Worm</span><i className="ez-glyph" aria-hidden="true" /></span>;
}

function AboutSection(){
  const version=String(window.WORMEZ_BUILD||'development').split('+')[0];
  return <div className="about-panel">
    <div className="about-heading"><div className="app-identity about-identity"><strong className="app-wordmark"><Wordmark /></strong><span className="app-tagline">Larval motion analysis</span></div><span className="about-version">Version {version}</span></div>
    <div className="about-group"><h3>Developed by</h3><strong>Mohammed Ayan Mahmood</strong></div>
    <div className="about-group"><h3>Research mentors</h3>
      <a href="https://www.truman.edu/faculty-staff/kafi/" target="_blank" rel="noopener noreferrer"><span><strong>Dr. Abu S. Mahfujur (Kafi) Rahman</strong><small>Computer science · Truman State University</small></span><i className="fas fa-external-link-alt" aria-hidden="true" /></a>
      <a href="https://www.truman.edu/faculty-staff/bberke/" target="_blank" rel="noopener noreferrer"><span><strong>Dr. Brett Berke</strong><small>Biology · Truman State University</small></span><i className="fas fa-external-link-alt" aria-hidden="true" /></a>
    </div>
    <div className="about-group"><h3>Open source</h3><p>Third-party components retain their own licenses.</p>
      <details className="about-licenses"><summary>Credits & licenses</summary><ul><li>Vitrio 0.1.2 · MIT</li><li>Glisse 0.5.0 · MIT</li><li>React 19.1.1 · MIT</li><li>Font Awesome Free 5.15.4 · CC BY 4.0 / OFL 1.1 / MIT</li><li>OpenCV.js 4.13.0 · Apache 2.0</li><li>MP4Box 2.4.1 · BSD 3-Clause</li></ul></details>
    </div>
  </div>
}

const stagePreviews=[
 {title:'Videos',summary:'Load a video, choose a folder, or connect a camera. Everything stays local.',detail:'Single video · folder · camera'},
 {title:'Setup',summary:'Check timing and scale, then confirm the visible start and end. Interior anchors are optional.',detail:'Timing · calibration · boundary anchors'},
 {title:'Analyze',summary:'Press Start analysis to track anchor intervals and calculate measurements automatically. Review uncertain regions.',detail:'Movement · uncertainty · H/C/T'},
 {title:'Results',summary:'Inspect synchronized plots and export per-video or folder-wide reports.',detail:'Pathway · coverage · export'}
] as const;
const previewSteps=[['Load videos or a folder','Preview the source recording','Keep every frame local'],['Check timing and scale','Review suggested anchors','Confirm visible start and end'],['Press Start analysis','Measurements appear automatically','Review uncertain intervals'],['Inspect pathway and plots','Check coverage and unresolved gaps','Export reports or a batch ZIP']] as const;

function StagePreview({stage,expanded,onClose}:{stage:number;expanded:boolean;onClose:()=>void}){
  const preview=stagePreviews[stage];
  return <div className={`stage-preview${expanded?' expanded':''}`} id="stage-preview" role={expanded?'region':'status'} aria-label={`${preview.title} preview`} aria-live={expanded?undefined:'polite'}>
    <div className="stage-preview-heading"><span>{expanded?'Feature preview':'Preview'}</span>{expanded&&<button type="button" onClick={onClose} aria-label="Close feature preview"><i className="fas fa-times" aria-hidden="true" /></button>}</div>
    <div className={`stage-preview-art preview-art-${stage}`} aria-hidden="true">
      {stage===0?<><i className="fas fa-file-video" /><span className="preview-or">or</span><i className="fas fa-video" /></>:null}
      {stage===1?<><span className="preview-timeline"><i /><i /><i /></span><i className="fas fa-map-marker-alt" /></>:null}
      {stage===2?<><i className="fas fa-long-arrow-alt-right" /><span className="preview-verified"><i className="fas fa-check" /></span><i className="fas fa-long-arrow-alt-left" /></>:null}
      {stage===3?<><svg viewBox="0 0 140 52" focusable="false"><path d="M4 42 C29 35 34 6 63 18 S103 49 136 8" /></svg><i className="fas fa-chart-line" /></>:null}
    </div>
    <strong>{preview.title}</strong><p>{preview.summary}</p>{expanded&&<ul>{previewSteps[stage].map(step=><li key={step}>{step}</li>)}</ul>}<small>{preview.detail}</small>
  </div>
}

export default function App(){
  const [workflow,dispatch]=useReducer(workflowReducer,initialWorkflow);
  const [settings,setSettings]=useState(false);
  const settingsPanel=useRef<HTMLElement>(null);
  useDialogFocus(settings,settingsPanel,()=>setSettings(false));

  const [hoverStage,setHoverStage]=useState<number|null>(null);
  const [openedStage,setOpenedStage]=useState<number|null>(null);
  
  const [settingsTab,setSettingsTab]=useState<'appearance'|'alerts'|'about'>('appearance');
  const [theme,setTheme]=useState<Theme>(()=>{const saved=preference('wormez.theme','light');/* the boot script migrates the old 'system' default to light once */return saved==='light'||saved==='dark'?saved:'system'});
  const [screensaverSeconds,setScreensaverSeconds]=useState(()=>{
    const saved=Number(preference('wormez.screensaverSeconds','120'));
    return [120,300,600,900,1800].includes(saved)?saved:120;
  });
  const [factsEnabled,setFactsEnabled]=useState(()=>preference('wormez.biologyScreensaver','on')!=='off');
  const [glass,setGlass]=useState(()=>preference('wormez.glass','on')!=='off');
  const [sidebarAlpha,setSidebarAlpha]=useState(()=>{const v=Number(preference('wormez.sidebarOpacity','82'));return Number.isFinite(v)?Math.min(100,Math.max(30,v)):82;});
  const [sound,setSound]=useState(()=>preference('wormez.sound','on')!=='off');
  useEffect(()=>{
    document.documentElement.classList.add('react-ui');
    if('wormezDesktop' in window)document.documentElement.classList.add('desktop-app');
    const machine=getLegacy()?.machine;
    const sync=()=>{
      const legacy=getLegacy(),s=legacy?.state,context=machine?.getSnapshot().context,phase=context?.phase??derivePhase(s);
      document.body.dataset.phase=phase;document.body.dataset.mediaReady=String(context?.mediaReady??!!(s?.loaded||s?.cameraStream));
      dispatch({type:'transition',stage:context?.stage??s?.workspaceStage,phase,clipId:context?.clipId??s?.clipId??0,jobId:context?.jobId??s?.jobId??0,message:context?.message||s?.workflowMessage||phaseCopy[phase],pass:context?.pass||legacy?.job?.pass,error:phase==='error'?'See diagnostics for the recorded error.':undefined});
    };
    sync();requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.remove('ui-booting')));
    if(machine)return machine.subscribe(sync);
    const id=window.setInterval(sync,120);return()=>window.clearInterval(id);

  },[]);
  useEffect(()=>{if(theme==='system')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=theme;savePreference('wormez.theme',theme)},[theme]);
  useEffect(()=>{document.documentElement.dataset.glass=glass?'on':'off';savePreference('wormez.glass',glass?'on':'off')},[glass]);
  useEffect(()=>{document.documentElement.style.setProperty('--sidebar-alpha',String(sidebarAlpha/100));savePreference('wormez.sidebarOpacity',String(sidebarAlpha))},[sidebarAlpha]);
  useEffect(()=>{document.documentElement.classList.remove('sidebar-collapsed');try{localStorage.removeItem('wormez.sidebar')}catch{}},[]);
  useEffect(()=>{const control=document.getElementById('soundAlerts') as HTMLInputElement|null;if(control)control.checked=sound;savePreference('wormez.sound',sound?'on':'off')},[sound]);
  useEffect(()=>{if(!settings)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setSettings(false)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[settings]);
  const phase=workflow.phase;
  const busy=['loading','scanning','analyzing','recording','finalizingRecording'].includes(phase);
  const phrase=workflow.stage==='results'?'Inspect verified movement, body measurements and coverage':statusPhrase(phase,workflow.pass);
  const legacyStage=phase==='idle'||phase==='loading'||phase==='cameraPreview'||phase==='recording'||phase==='finalizingRecording'?0:phase==='scanning'||phase==='reviewing'||phase==='reviewingBoundary'||phase==='ready'?1:phase==='results'?3:2;
  const stageIds=['videos','setup','fit','results'] as const;
  const stage=workflow.stage?stageIds.indexOf(workflow.stage==='analyze'?'fit':workflow.stage):legacyStage;
  const stageNames=['Videos','Setup','Analyze','Results'];
  const previewStage=hoverStage??openedStage;
  return <>
    <FluidPanels /><WorkspaceGlass enabled={glass} /><WorkScrollbar /><UpdateCard /><BiologyScreensaver enabled={factsEnabled} idleMs={screensaverSeconds*1000} />
    <aside className={"app-sidebar"} aria-label="WormEZ workspace">
      <div className="sidebar-top"><div className="app-identity"><strong className="app-wordmark"><Wordmark /></strong><span className="app-tagline">Larval motion analysis</span></div><img className="collapsed-brand" src="./lib/wormez-mark.svg" alt="WormEZ" /></div>
      <div className="sidebar-label">Workspace</div>
      <nav aria-label="Analysis stages" onMouseLeave={()=>setHoverStage(null)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setHoverStage(null)}}>
        <ol className="stage-list">{stageNames.map((name,index)=><li key={name} className={`${index===stage?'active':index<stage?'complete':''}${index===stage&&busy?' busy':''}${previewStage===index?' previewed':''}`} onMouseEnter={()=>setHoverStage(index)}>
          <button className="stage-trigger" type="button" aria-label={name} aria-current={index===stage?'step':undefined} aria-expanded={openedStage===index} aria-describedby={previewStage===index?'stage-preview':undefined} onFocus={()=>setHoverStage(index)} onClick={()=>{getLegacy()?.workspace?.navigate(stageIds[index]);setOpenedStage(null);setHoverStage(null)}}><span className="stage-symbol" aria-hidden="true"><i className={`fas fa-${['file-video','sliders-h','chart-line','file-export'][index]}`} /></span><span className="stage-name">{name}</span></button>
        </li>)}</ol>
        {previewStage!==null&&<StagePreview stage={previewStage} expanded={openedStage===previewStage} onClose={()=>{setOpenedStage(null);setHoverStage(null)}} />}
      </nav>
      <div className="sidebar-utilities"><button className="sidebar-settings" type="button" aria-label="Settings" onClick={()=>{setSettings(true);}}><i className="fas fa-cog" aria-hidden="true" /><span>Settings</span></button></div>
    </aside>
    <header className="app-bar">
      <div className="workflow-status" role="status" aria-live="polite"><span className="status-copy">{phrase}</span>{busy&&<span className="working-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>}</div>
      <div className="app-actions"><button type="button" className="top-action primary" onClick={()=>document.getElementById('loadBtn')?.click()}><i className="fas fa-file-video" aria-hidden="true" />Load Video</button><button type="button" className="top-action" onClick={()=>getLegacy()?.workspace?.loadFolder()}><i className="fas fa-folder-open" aria-hidden="true" />Load Folder</button><button type="button" className="top-action" onClick={()=>document.getElementById('cameraBtn')?.click()}><i className="fas fa-video" aria-hidden="true" />Use Camera</button></div>
    </header>
    {settings&&<div className="settings-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)setSettings(false)}}><section ref={settingsPanel} className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
      <header><strong>Settings</strong><button type="button" className="settings-close" onClick={()=>setSettings(false)} aria-label="Close settings"><i className="fas fa-times" aria-hidden="true" /></button></header>
      <div className="settings-layout"><nav aria-label="Settings sections"><button type="button" aria-current={settingsTab==='appearance'?'page':undefined} className={settingsTab==='appearance'?'selected':''} onClick={()=>setSettingsTab('appearance')}><i className="fas fa-palette" aria-hidden="true" /> Appearance</button><button type="button" aria-current={settingsTab==='alerts'?'page':undefined} className={settingsTab==='alerts'?'selected':''} onClick={()=>setSettingsTab('alerts')}><i className="far fa-bell" aria-hidden="true" /> Alerts</button><button type="button" aria-current={settingsTab==='about'?'page':undefined} className={settingsTab==='about'?'selected':''} onClick={()=>setSettingsTab('about')}><i className="fas fa-info-circle" aria-hidden="true" /> About</button></nav>
      <div className="settings-content">{settingsTab==='appearance'?<><h2>Appearance</h2><h3 className="settings-group-heading">Window and theme</h3><div className="settings-row"><div><strong>Window glass</strong><small>Lower to see more of the desktop behind the app.</small></div><label className="opacity-control"><input type="range" min={30} max={100} step={1} value={sidebarAlpha} onChange={e=>setSidebarAlpha(Number(e.target.value))} aria-label="Window opacity" /><output>{sidebarAlpha}%</output></label></div><div className="settings-row"><div><strong>Theme</strong><small>Choose the workspace colors.</small></div><div className="settings-options" role="group" aria-label="Appearance theme">{(['system','light','dark'] as const).map(choice=><button key={choice} type="button" aria-pressed={theme===choice} onClick={()=>setTheme(choice)}>{choice[0].toUpperCase()+choice.slice(1)}</button>)}</div></div><WindowSettings /><label className="settings-row settings-toggle"><span><strong>Glass surfaces</strong><small>Soft translucent controls around the video.</small></span><input type="checkbox" checked={glass} onChange={e=>setGlass(e.target.checked)} /></label><h3 className="settings-group-heading">When idle</h3><div className="settings-row"><div><strong>Science facts screensaver</strong><small>Click or press Esc to return.</small></div><div className="screensaver-settings"><button className="btn" type="button" onClick={()=>window.dispatchEvent(new Event('wormez:preview-screensaver'))}>Preview</button><label className="settings-toggle"><input type="checkbox" aria-label="Science facts screensaver" checked={factsEnabled} onChange={e=>{setFactsEnabled(e.target.checked);savePreference('wormez.biologyScreensaver',e.target.checked?'on':'off')}} /></label></div></div>
      <label className="settings-row"><span><strong>Screensaver timeout</strong><small>Time without activity before the screensaver starts.</small></span><select value={screensaverSeconds} disabled={!factsEnabled} onChange={event=>{
        const seconds=Number(event.target.value);
        setScreensaverSeconds(seconds);
        savePreference('wormez.screensaverSeconds',String(seconds));
      }}>
        {[120,300,600,900,1800].map(seconds=><option key={seconds} value={seconds}>{seconds/60+' minutes'}</option>)}
      </select></label></>:settingsTab==='alerts'?<><h2>Alerts</h2><label className="settings-row settings-toggle"><span><strong>Attention sound</strong><small>Play a local tone when analysis needs your input.</small></span><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)} /></label></>:<AboutSection />}</div></div>
    </section></div>}
    
    
  </>
}

/* Window size (desktop app only). Full screen on maximize decides what the green maximize button does:
   on = real full screen (Dock and menu bar hidden), off = fill the screen with the Dock visible. */
type DesktopWindow={windowState:()=>Promise<{trueMaximize:boolean}>;setTrueMaximize:(on:boolean)=>Promise<boolean>};
function WindowSettings(){
  const bridge=(window as unknown as {wormezDesktop?:Partial<DesktopWindow>}).wormezDesktop;
  const [state,setState]=useState({trueMaximize:false});
  useEffect(()=>{bridge?.windowState?.().then(s=>setState({trueMaximize:!!s.trueMaximize})).catch(()=>{});},[]);
  if(!bridge?.setTrueMaximize)return null;
  return <>
    <label className="settings-row settings-toggle"><span><strong>Full screen on maximize</strong><small>{state.trueMaximize?'Maximize goes full screen, hiding the Dock and menu bar.':'Maximize fills the screen and keeps the Dock visible.'}</small></span>
      <input type="checkbox" checked={state.trueMaximize} onChange={async e=>{const trueMaximize=await bridge.setTrueMaximize!(e.target.checked);setState(s=>({...s,trueMaximize}));}} /></label>
    
  </>;
}
