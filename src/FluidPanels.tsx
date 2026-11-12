import {useEffect} from 'react';

// Keep the legacy inspectors in DOM/workflow order while packing content-sized
// cards into the compact workspace's two columns. No cloned controls or state.
export function FluidPanels(){
  useEffect(()=>{
    const host=document.querySelector<HTMLElement>('.workspace > .controls');
    if(!host)return;
    const media=window.matchMedia('(max-width:1199px)');let frame=0;
    const cards=()=>Array.from(host.children).filter((el):el is HTMLElement=>el instanceof HTMLElement);
    const arrange=()=>{
      frame=0;
      if(!media.matches){delete host.dataset.fluidPanels;for(const card of cards())card.style.removeProperty('grid-row-end');return;}
      const gap=parseFloat(getComputedStyle(host).columnGap)||16;
      const sizes=cards().map(card=>({card,height:card.getBoundingClientRect().height}));
      host.dataset.fluidPanels='true';
      for(const {card,height} of sizes){const span=`span ${Math.max(1,Math.ceil(height+gap))}`;if(card.style.gridRowEnd!==span)card.style.gridRowEnd=span;}
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(arrange);};
    const resize=new ResizeObserver(schedule);resize.observe(host);for(const card of cards())resize.observe(card);
    const mutation=new MutationObserver(()=>{for(const card of cards())resize.observe(card);schedule();});
    mutation.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
    media.addEventListener('change',schedule);schedule();
    return()=>{cancelAnimationFrame(frame);resize.disconnect();mutation.disconnect();media.removeEventListener('change',schedule);delete host.dataset.fluidPanels;for(const card of cards())card.style.removeProperty('grid-row-end');};
  },[]);
  return null;
}
