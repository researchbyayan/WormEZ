import {useEffect,type RefObject} from 'react';
export function useDialogFocus(open:boolean,dialog:RefObject<HTMLElement|null>,close:()=>void){
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement as HTMLElement|null;
  const controls=()=>Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')||[]).filter(el=>el.getClientRects().length);
  controls()[0]?.focus();
  const key=(event:KeyboardEvent)=>{
   if(document.querySelector('.biology-screensaver,dialog[open]'))return;
   if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
   if(event.key==='Tab'){const list=controls(),first=list[0],last=list.at(-1);if(!first)return;if(!dialog.current?.contains(document.activeElement)||event.shiftKey&&document.activeElement===first){event.preventDefault();(event.shiftKey?last:first)?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
   if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase()))event.stopPropagation();
  };
  window.addEventListener('keydown',key,true);
  return()=>{window.removeEventListener('keydown',key,true);previous?.isConnected&&previous.focus({preventScroll:true})};
 },[open,dialog]);
}
