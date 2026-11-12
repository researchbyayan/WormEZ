/* Per-frame verification step for one tracking pass. Shared by the page and by
   lib/pass-worker.js so both run identical logic; only where it runs differs. */
(function(root){
  'use strict';
  const T=()=>root.WormTracker,A=()=>root.WormAnatomy;

  // ctx: {reference, crop, larvaLen}
  function candidateAnatomy(cv,image,c,ctx){
    if(!c)return null;
    const key=JSON.stringify([c.outline,c.polarity,c.threshold]),memo=ctx.anatomyMemo;
    if(memo&&memo.key===key&&memo.reference===ctx.reference)return structuredClone(memo.value);
    const value=computeAnatomy(cv,image,c,ctx);
    ctx.anatomyMemo={key,reference:ctx.reference,value:structuredClone(value)};
    return value;
  }
  function computeAnatomy(cv,image,c,ctx){
    if(!c)return null;
    const direct=A().geometry(c.outline);
    if(direct||c.polarity!=='dark'||!ctx.reference)return direct;
    // The outer dark contour can join adjacent substrate marks while a
    // stricter threshold still preserves the animal's medial body.
    const stricter={...ctx.reference,threshold:Math.max(60,c.threshold-20)};
    const alternatives=T().localCandidates(cv,image,stricter,ctx.crop,c,Math.max(32,ctx.larvaLen*1.5))
      .filter(p=>T().distance(p,c)<=ctx.larvaLen*.2&&p.area/c.area>.4&&p.area/c.area<1.4)
      .sort((a,b)=>T().distance(a,c)-T().distance(b,c));
    for(const p of alternatives){const anatomy=A().geometry(p.outline);if(anatomy)return anatomy;}
    return null;
  }

  function imageFromPixels(cv,pixels,region,width,height){
    const part=cv.matFromImageData(pixels);if(!region)return part;
    const image=cv.Mat.zeros(height,width,cv.CV_8UC4);let target;
    try{target=image.roi(new cv.Rect(region.x,region.y,pixels.width,pixels.height));part.copyTo(target);return image;}
    catch(e){image.delete();throw e;}finally{target?.delete();part.delete();}
  }
  // Include every search/flow window, including distant user anchors. Full
  // source frames are still supplied for the independent camera-motion checks.
  function processingRegion(cfg,cursor,frame,width,height){
    if(!cursor.prev)return null;
    const centers=[cursor.prev,cfg.hints?.get(frame),cfg.manual.find(p=>p.frame===frame)].filter(Boolean);
    const radius=Math.max(32,cfg.larvaLen*(cfg.wider||!cursor.locked?5:3))+Math.max(32,cfg.larvaLen*1.5)+2;
    const x=Math.max(0,Math.floor(Math.min(...centers.map(p=>p.x))-radius)),y=Math.max(0,Math.floor(Math.min(...centers.map(p=>p.y))-radius));
    const right=Math.min(width,Math.ceil(Math.max(...centers.map(p=>p.x))+radius)),bottom=Math.min(height,Math.ceil(Math.max(...centers.map(p=>p.y))+radius));
    if(right<=x||bottom<=y||((right-x)*(bottom-y)>width*height*.8))return null;
    return {x,y,w:right-x,h:bottom-y};
  }
  /* cfg: {dir, initial, manual, wider, hints:Map|null, recovery:Set|null, multi:bool,
           reference, crop, fps, larvaLen, maxStepBL} · all structured-clone friendly. */
  class PassState {
    constructor(cfg){
      this.cfg=cfg;this.out=[];
      this.prevImage=null;this.sceneImage=null;this.sceneFrame=null;this.scenePosition=cfg.initial;
      this.prev=cfg.initial;this.twoBack=null;this.locked=!!cfg.initial;
    }
    skip(f){
      const prev=this.prev;
      this.out.push({frame:f,x:prev?.x||0,y:prev?.y||0,valid:false,reason:'Marked unavailable by user'});
      this.locked=false;this.prev=null;this.twoBack=null;
    }
    step(cv,image,f,peers=[]){
      const cfg=this.cfg,out=this.out,L=cfg.larvaLen,tr=T();
      const clock=()=>performance.now(),started=clock();let cameraMs=0,detectMs=0,flowMs=0,anatomyMs=0;
      let cameraShift=false;
      if(!this.sceneImage){this.sceneImage=image.clone();this.sceneFrame=f;this.scenePosition=this.prev;}
      else if(Math.abs(f-this.sceneFrame)>=Math.max(1,Math.round(cfg.fps))){
        const shift=tr.cameraMotion(cv,this.sceneImage,image,{...(this.scenePosition||this.prev||{x:image.cols/2,y:image.rows/2}),length:L});
        cameraShift=shift!==null&&shift>Math.max(3,L*.15);
        if(cameraShift)for(const q of out)if(Math.abs(q.frame-f)<=cfg.fps){q.valid=false;q.reason='Camera movement: center motion cannot be isolated';}
        this.sceneImage.delete();this.sceneImage=image.clone();this.sceneFrame=f;this.scenePosition=this.prev;
      }
      cameraMs=clock()-started;const detectStarted=clock();
      const prev=this.prev,locked=this.locked,twoBack=this.twoBack,wider=cfg.wider;
      const fixed=cfg.manual.find(p=>p.frame===f);
      const hint=cfg.hints?.get(f);
      const list=tr.localCandidates(cv,image,cfg.reference,cfg.crop,hint||prev,Math.max(32,L*(wider||!locked?5:3)));
      detectMs=clock()-detectStarted;const flowStarted=clock();
      const motion=this.prevImage&&locked?tr.flow(cv,this.prevImage,image,prev,L):null;
      flowMs=clock()-flowStarted;
      const gate=Math.max(4,L*cfg.maxStepBL)*(wider?2:1);
      const c=tr.choose(list,hint||motion||prev,hint?Math.max(4,L/3):locked?gate:L*2);
      let valid=!!c,maySeed=!!c,reason=c?'':'No unambiguous matching blob';
      if(cfg.multi&&!hint&&!fixed&&!cfg.recovery?.has(f)){valid=false;maySeed=false;reason='Identity unresolved here; add an anchor to continue this worm';}
      if(c&&peers.some(p=>tr.distance(c,p)<Math.max(4,L*.35))){
        valid=false;maySeed=false;reason='Another worm is too close to confirm this identity';
      }
      if(c&&this.prevImage){
        const prior=locked&&prev&&Math.abs(f-prev.frame)===1?prev:null,second=locked&&twoBack&&Math.abs(f-twoBack.frame)===2?twoBack:null;
        const physical=tr.proximity(c,prior,second,L,cfg.maxStepBL);
        const flowAgrees=!!motion&&tr.distance(c,motion)<=L/4;
        const bodyContinues=tr.segmentFallback(c,prior,cfg.reference,L);
        valid=valid&&locked&&(flowAgrees||bodyContinues)&&physical.ok;
        maySeed=maySeed&&physical.ok;
        if(!physical.ok)reason=physical.reason;else if(!valid&&!reason)reason='Motion and appearance checks disagree';
      }
      if(cameraShift){valid=false;maySeed=false;reason='Camera movement: center motion cannot be isolated';}
      const anatomyStarted=clock();
      const anatomy=(valid||fixed)?candidateAnatomy(cv,image,c,cfg):null;
      anatomyMs=clock()-anatomyStarted;
      if(fixed){
        this.twoBack=prev;this.prev={...fixed,frame:f};this.locked=true;
        out.push({...fixed,valid:true,reason:'',anchorMismatch:!c||tr.distance(c,fixed)>L/4||!!prev&&Math.abs(f-prev.frame)===1&&tr.distance(prev,fixed)>Math.max(4,L*cfg.maxStepBL),anatomy:c&&tr.distance(c,fixed)<L/4?anatomy:null});
      }else{
        const pos=c||prev||{x:0,y:0};out.push({frame:f,x:pos.x,y:pos.y,valid,reason,anatomy});
        // Segmentation can restart a lost hypothesis; the other pass must independently confirm it.
        if(maySeed){this.twoBack=locked?prev:null;this.prev={...pos,frame:f};this.locked=true;}else{this.locked=false;this.twoBack=null;}
      }
      if(this.prevImage)this.prevImage.delete();this.prevImage=image.clone();
      return {valid,anatomy,prev:this.prev,locked:this.locked,count:out.length,profile:{cameraMs,detectMs,flowMs,anatomyMs,coreMs:clock()-started}};
    }
    dispose(){
      if(this.prevImage)this.prevImage.delete();if(this.sceneImage)this.sceneImage.delete();
      this.prevImage=null;this.sceneImage=null;
    }
  }

  root.WormPassCore={candidateAnatomy,imageFromPixels,processingRegion,PassState};
  if(typeof module!=='undefined')module.exports=root.WormPassCore;
})(typeof window==='undefined'?globalThis:window);
