import {useEffect,useRef,useState} from 'react';
import {biologyFacts} from './biologyFacts';
import {getLegacy} from './legacy';

type Bridge={setScreensaverActive?:(active:boolean)=>void;onDismissScreensaver?:(fn:()=>void)=>(()=>void)};
export const FACT_TYPE_MS=32/.75;
export const FACT_HOLD_MS=11000;
function bridge(){return (window as unknown as {wormezDesktop?:Bridge}).wormezDesktop}
export function BiologyScreensaver({enabled=true,idleMs=120000}:{enabled?:boolean;idleMs?:number}){
  const [active,setActive]=useState(false),[index,setIndex]=useState(()=>Math.floor(Math.random()*biologyFacts.length)),[typed,setTyped]=useState('');
  const panel=useRef<HTMLDivElement>(null),previousFocus=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    let lastActivity=Date.now();
    const activity=()=>{lastActivity=Date.now()};
    const show=()=>setActive(true);
    const attention=()=>{activity();setActive(false)};
    const key=(event:KeyboardEvent)=>{if(active&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();setActive(false)}else activity()};
    const timer=window.setInterval(()=>{
      if(!enabled||active||document.visibilityState!=='visible'||!document.hasFocus()||Date.now()-lastActivity<idleMs)return;
      const state=getLegacy()?.state as unknown as {pendingAnchor?:unknown;scalePicking?:boolean;landmarkMode?:unknown;kfMode?:boolean;dragStart?:unknown;workflowPhase?:string};
      if(state?.pendingAnchor||state?.scalePicking||state?.landmarkMode||state?.kfMode||state?.dragStart)return;
      if(['cameraPreview','recording','finalizingRecording'].includes(state?.workflowPhase||''))return;
      if(document.querySelector('.settings-scrim, dialog[open]')||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return;
      if([...document.querySelectorAll('video')].some(video=>!video.paused))return;
      setActive(true);
    },1000);
    window.addEventListener('pointermove',activity,{passive:true});window.addEventListener('pointerdown',activity,{passive:true});window.addEventListener('keydown',key,true);window.addEventListener('wormez:preview-screensaver',show);window.addEventListener('wormez:issue',attention);
    return()=>{clearInterval(timer);window.removeEventListener('pointermove',activity);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',key,true);window.removeEventListener('wormez:preview-screensaver',show);window.removeEventListener('wormez:issue',attention)};
  },[active,enabled,idleMs]);
  useEffect(()=>{if(!enabled)setActive(false)},[enabled]);
  useEffect(()=>{
    document.documentElement.dataset.screensaver=active?'on':'off';bridge()?.setScreensaverActive?.(active);
    const unsubscribe=bridge()?.onDismissScreensaver?.(()=>setActive(false));
    if(active){previousFocus.current=document.activeElement as HTMLElement;panel.current?.focus()}
    else previousFocus.current?.focus?.({preventScroll:true});
    return()=>{unsubscribe?.();bridge()?.setScreensaverActive?.(false)};
  },[active]);
  useEffect(()=>{
    if(!active)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fact=biologyFacts[index].text;let count=0;setTyped(reduced?fact:'');
    const typing=reduced?undefined:window.setInterval(()=>{count++;setTyped(fact.slice(0,count));if(count>=fact.length)clearInterval(typing)},FACT_TYPE_MS);
    const next=window.setTimeout(()=>setIndex(value=>(value+1)%biologyFacts.length),reduced?15000:fact.length*FACT_TYPE_MS+FACT_HOLD_MS);
    return()=>{clearInterval(typing);clearTimeout(next)};
  },[active,index]);
  if(!active)return null;
  return <div ref={panel} className="biology-screensaver" role="dialog" aria-modal="true" aria-label="Biology facts screensaver" tabIndex={-1} data-fact-count={biologyFacts.length} onKeyDown={event=>{if(event.key==='Tab'){event.preventDefault();const link=panel.current?.querySelector<HTMLAnchorElement>('a');if(document.activeElement===link)panel.current?.focus();else link?.focus()}if((event.key==='Enter'||event.key===' ')&&!(event.target as HTMLElement).closest('a')){event.preventDefault();event.stopPropagation();setActive(false)}}} onPointerDown={event=>{if((event.target as HTMLElement).closest('a'))return;event.preventDefault();event.stopPropagation();setActive(false)}}>
    <div className="screensaver-copy"><span className="screensaver-eyebrow">Did you know?</span><p key={index} aria-hidden="true">{typed}<span className="type-caret" /></p><span className="sr-only">{biologyFacts[index].text}</span>{typed===biologyFacts[index].text&&<a className="screensaver-source" href={biologyFacts[index].sourceUrl} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()} aria-label={`Read source: ${biologyFacts[index].sourceLabel}`}>{biologyFacts[index].sourceLabel} <i className="fas fa-external-link-alt" aria-hidden="true" /></a>}</div>
    <span className="screensaver-dismiss">Click anywhere or press Esc to return</span>
  </div>;
}
