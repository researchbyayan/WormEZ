import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
const root=document.getElementById('wormezReactShell');
if(root)createRoot(root).render(<StrictMode><App/></StrictMode>);
// Scrollbars stay hidden until something scrolls, then fade after a pause (ChemEZ behaviour).
let scrollSleep=0;
document.addEventListener('scroll',()=>{document.documentElement.classList.add('scroll-awake');clearTimeout(scrollSleep);scrollSleep=window.setTimeout(()=>document.documentElement.classList.remove('scroll-awake'),900);},{capture:true,passive:true});
