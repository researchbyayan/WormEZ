/* Runs one tracking pass's per-frame computation off the page thread.
   Decoding stays on the page; frames arrive as transferred RGBA buffers. */
importScripts('opencv-4.13.0.js','anatomy.js','tracking.js','pass-core.js?v=20261110-fast-sections');

// cv is a thenable that never settles in workers: poll for it, and wrap it so resolve() does not adopt it.
const cvReady=new Promise((resolve,reject)=>{
  const started=Date.now();
  const check=()=>{
    if(self.cv?.Mat&&self.cv.calcOpticalFlowPyrLK)resolve({cv:self.cv});
    else if(Date.now()-started>60000)reject(new Error('OpenCV unavailable in worker'));
    else setTimeout(check,25);
  };check();
});
const states=new Map();

self.onmessage=async({data:m})=>{
  try{
    const {cv}=await cvReady;
    if(m.type==='ping'){self.postMessage({id:m.id,ok:true});return;}
    const key=m.taskId||'default';let state=states.get(key);
    if(m.type==='init'){state?.dispose();state=new WormPassCore.PassState(m.cfg);states.set(key,state);self.postMessage({id:m.id,ok:true});return;}
    if(m.type==='skip'){state.skip(m.frame);self.postMessage({id:m.id,ok:true,count:state.out.length});return;}
    if(m.type==='step'){
      const conversionStarted=performance.now();
      const image=WormPassCore.imageFromPixels(cv,{data:new Uint8ClampedArray(m.buffer),width:m.width,height:m.height},m.region,m.fullWidth,m.fullHeight);
      try{const conversionMs=performance.now()-conversionStarted,result=state.step(cv,image,m.frame,m.peers);result.profile.conversionMs=conversionMs;const reply=m.preview?result:{...result,anatomy:null,prev:result.prev?{x:result.prev.x,y:result.prev.y,frame:result.prev.frame}:null};self.postMessage({id:m.id,ok:true,result:reply});}finally{image.delete();}
      return;
    }
    if(m.type==='finish'){const out=state?state.out:[];state?.dispose();states.delete(key);self.postMessage({id:m.id,ok:true,out});return;}
    if(m.type==='reset'){state?.dispose();states.delete(key);self.postMessage({id:m.id,ok:true});return;}
    throw new Error('Unknown message '+m.type);
  }catch(e){self.postMessage({id:m.id,ok:false,error:String(e?.stack||e?.message||e)});}
};
