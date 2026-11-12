import {useEffect,useRef,useState} from 'react';

// Port of ChemEZ's ChatScrollbar for the page scroll. It spans only the working area, from 10px
// below the fixed top bar to 10px above the bottom. It rests hidden and wakes while scrolling,
// when the pointer comes near or while dragging.
const TOPBAR=66,INSET=10;
export function WorkScrollbar(){
  const track=useRef<HTMLDivElement>(null),bar=useRef<HTMLDivElement>(null);
  const [thumb,setThumb]=useState({top:0,height:0,scrollable:false});
  const [awake,setAwake]=useState(false);
  const [atEnd,setAtEnd]=useState(true);
  const [inset,setInset]=useState({top:TOPBAR+INSET,bottom:INSET});
  const drag=useRef<{y:number;top:number}|null>(null),sleep=useRef(0);
  const el=()=>document.scrollingElement as HTMLElement;
  const wake=()=>{setAwake(true);clearTimeout(sleep.current);sleep.current=window.setTimeout(()=>{if(!drag.current)setAwake(false);},1200);};
  useEffect(()=>{
    let frame=0;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const room=track.current?.clientHeight||0,{scrollTop,scrollHeight,clientHeight}=el();
      const visible=clientHeight-TOPBAR,content=scrollHeight-TOPBAR,scrollable=scrollHeight>clientHeight+1;
      // Drawn at 80% of its proportional length so it reads as a handle, not a slab (as in ChemEZ).
      // Shorter handle than proportional: at most 30% of the track, at least 28px (room for the chevron).
      const height=scrollable?Math.min(room*.3,Math.max(28,0.6*room*visible/content-12)):room;
      const top=scrollable?(room-height)*scrollTop/(scrollHeight-clientHeight):0;
      setThumb(p=>p.top===top&&p.height===height&&p.scrollable===scrollable?p:{top,height,scrollable});
      setAtEnd(scrollHeight-scrollTop-clientHeight<100);
      // Track spans exactly the content: from the first card's top to the last card's bottom at full scroll.
      const ws=document.querySelector('.workspace') as HTMLElement|null;
      if(ws){const parent=ws.parentElement||document.body,kids=[...parent.children].filter(k=>(k as HTMLElement).offsetHeight>0) as HTMLElement[];
        const top=Math.max(TOPBAR+INSET,ws.getBoundingClientRect().top+scrollTop-scrollTop*0);
        const lastBottom=Math.max(...kids.map(k=>k.getBoundingClientRect().bottom+scrollTop));
        const below=Math.max(INSET,scrollHeight-lastBottom);
        const firstTop=Math.max(TOPBAR+INSET,ws.offsetTop>0?ws.getBoundingClientRect().top+scrollTop:top);
        setInset(p=>{const n={top:Math.min(firstTop,TOPBAR+40),bottom:Math.min(below,120)};return p.top===n.top&&p.bottom===n.bottom?p:n;});}
    });};
    const near=(e:PointerEvent)=>{const b=bar.current?.getBoundingClientRect();if(b&&e.clientX>b.left-40&&e.clientY>b.top&&e.clientY<b.bottom)wake();};
    const onScroll=()=>{measure();wake();};
    measure();
    window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',measure);window.addEventListener('pointermove',near,{passive:true});
    const resize=new ResizeObserver(measure);resize.observe(document.body);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',measure);window.removeEventListener('pointermove',near);resize.disconnect();clearTimeout(sleep.current);};
  },[]);
  const toEnd=()=>{const s=el();s.scrollTo({top:s.scrollHeight,behavior:'smooth'});wake();};
  const moveTo=(top:number)=>{const room=track.current?.clientHeight||0,s=el();if(room<=thumb.height)return;s.scrollTop=Math.max(0,Math.min(1,top/(room-thumb.height)))*(s.scrollHeight-s.clientHeight);};
  return <div ref={bar} className={'work-scrollbar'+(thumb.scrollable?'':' idle')+(awake?' awake':'')+(atEnd?'':' has-more')} style={{top:inset.top,bottom:inset.bottom}}>
    <div ref={track} className="work-scrollbar-track" onPointerDown={e=>{if(e.target!==e.currentTarget)return;const b=e.currentTarget.getBoundingClientRect();moveTo(e.clientY-b.top-thumb.height/2);}}>
      <div className="work-scrollbar-thumb" style={{top:thumb.top,height:thumb.height}}
        onDoubleClick={()=>{if(!atEnd)toEnd();}}
        onPointerDown={e=>{if((e.target as HTMLElement).closest('.work-scrollbar-latest'))return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={y:e.clientY,top:thumb.top};}}
        onPointerMove={e=>{const d=drag.current;if(d)moveTo(d.top+e.clientY-d.y);}}
        onPointerUp={()=>{drag.current=null;wake();}} onPointerCancel={()=>{drag.current=null;wake();}}>
        <button type="button" className="work-scrollbar-latest" aria-label="Scroll to the bottom" title="Scroll to the bottom (or double-click the bar)" tabIndex={atEnd?-1:0} onClick={toEnd}><i className="fas fa-angle-double-down" aria-hidden="true"/></button>
      </div>
    </div>
  </div>;
}
