/* WormEZ tracking primitives. OpenCV is supplied by the local pinned runtime. */
(function(root) {
  'use strict';
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const accepted = p => !!p && p.status !== 'uncertain';
  const linked = (a,b) => accepted(a) && accepted(b) && b.frame-a.frame <= 1.001;
  function proximity(candidate, previous, twoBack, length, maxStepBL=.5) {
    if(!candidate||!length)return {ok:false,reason:'Missing position or body length'};
    if(previous&&distance(candidate,previous)>Math.max(4,length*maxStepBL))
      return {ok:false,reason:'Movement exceeds physical limit (one frame)'};
    if(twoBack&&distance(candidate,twoBack)>length)
      return {ok:false,reason:'Movement exceeds physical limit (two frames)'};
    return {ok:true,reason:''};
  }
  function fiveFrameConsistency(points,length) {
    if(!(length>0))return points;
    return points.map((p,i)=>{
      if(!accepted(p)||p.status==='manual')return p;
      for(const direction of [-1,1]){
        const j=i+direction*5,q=points[j];if(!q||!accepted(q)||Math.abs(q.frame-p.frame)!==5)continue;
        let continuous=true;for(let k=Math.min(i,j);k<Math.max(i,j);k++)if(!linked(points[k],points[k+1])){continuous=false;break;}
        if(continuous&&distance(p,q)>2*length)return {...p,status:'uncertain',reason:'Movement exceeds two body lengths over five frames'};
      }
      return p;
    });
  }
  function segmentFallback(candidate,previous,reference,length){
    if(!candidate||!previous||reference?.polarity!=='dark'||candidate.polarity!=='dark'||!length)return false;
    if(distance(candidate,previous)>Math.max(4,length*.15))return false;
    if(candidate.contrast<Math.max(18,reference.contrast*.85))return false;
    if(candidate.length/reference.length<.6||candidate.length/reference.length>1.8)return false;
    if(candidate.area/reference.area<.5||candidate.area/reference.area>2.5)return false;
    return true;
  }
  class Cancelled extends Error {}
  class Job {
    constructor() { this.cancelled=false; this.paused=false; this.waiters=new Set(); this.pass='setup';this.started=Date.now();this.pausedMs=0;this.pauseAt=null; }
    cancel() { this.cancelled=true; this.abortController?.abort(); this.resume(); }
    pause() { if(!this.paused)this.pauseAt=Date.now();this.paused=true; }
    resume() { if(this.pauseAt!==null){this.pausedMs+=Date.now()-this.pauseAt;this.pauseAt=null;}this.paused=false; for(const wake of this.waiters)wake();this.waiters.clear(); }
    async checkpoint() {
      while(this.paused && !this.cancelled) await new Promise(resolve=>this.waiters.add(resolve));
      if(this.cancelled) throw new Cancelled();
    }
  }
  function intervals(points) {
    const out=[];
    for(const p of points) if(!accepted(p)) {
      const last=out[out.length-1];
      if(last && p.frame===last.end+1) last.end=p.frame; else out.push({start:p.frame,end:p.frame});
    }
    return out;
  }
  function reconcile(forward, backward, manual, length) {
    const b=new Map(backward.map(p=>[p.frame,p]));
    const m=new Map(manual.map(p=>[p.frame,p]));
    return forward.map(p=>{
      const q=b.get(p.frame), ok=p.valid && q && q.valid && distance(p,q)<=length/4;
      const anatomy=ok&&root.WormAnatomy?.agree(p.anatomy,q.anatomy,length)?{...p.anatomy}:null;
      if(m.has(p.frame)) return {...m.get(p.frame),status:'manual',origin:'manual',anatomy};
      // Verify body motion from two independent center tracks. A folded or
      // partially obscured outline can make head/tail anatomy unknowable
      // without invalidating a center that both passes independently found.
      const verified=ok;
      return {frame:p.frame,x:anatomy?(p.anatomy.center.x+q.anatomy.center.x)/2:ok?(p.x+q.x)/2:p.x,y:anatomy?(p.anatomy.center.y+q.anatomy.center.y)/2:ok?(p.y+q.y)/2:p.y,
        anatomy,
        status:verified?'verified':'uncertain',origin:'auto',reason:verified?'':(!p.valid?p.reason:!q?.valid?q?.reason||'No backward detection':'Passes disagree')};
    });
  }
  function anchors(points, fps, turnThreshold=30, bodyLength=0) {
    let last=-Infinity;
    return points.filter((p,i)=>{
      if(!accepted(p)) return false;
      const a=points[i-1],b=points[i+1];
      let turn=0;
      let before=a,after=b;
      if(bodyLength){
        let j=i-1;while(j>0&&linked(points[j-1],points[j])&&distance(points[j],p)<bodyLength/4)before=points[--j];
        j=i+1;while(j<points.length-1&&linked(points[j],points[j+1])&&distance(points[j],p)<bodyLength/4)after=points[++j];
      }
      if(linked(a,p)&&linked(p,b)&&distance(before,p)>=bodyLength/4&&distance(after,p)>=bodyLength/4)turn=Math.abs(Math.atan2((p.x-before.x)*(after.y-p.y)-(p.y-before.y)*(after.x-p.x),(p.x-before.x)*(after.x-p.x)+(p.y-before.y)*(after.y-p.y))*180/Math.PI);
      const take=p.status==='manual'||!accepted(a)||!accepted(b)||p.frame-last>=fps||(turn>turnThreshold&&(!bodyLength||p.frame-last>=fps/4));
      if(take) last=p.frame;
      return take;
    }).map(p=>({...p,origin:p.status==='manual'?'manual':'auto'}));
  }
  function turnAt(points,i,minDistance){
    const p=points[i];if(!accepted(p))return null;
    let lo=i,hi=i;
    while(lo>0&&linked(points[lo-1],points[lo])&&distance(points[lo],p)<minDistance)lo--;
    while(hi<points.length-1&&linked(points[hi],points[hi+1])&&distance(points[hi],p)<minDistance)hi++;
    if(lo===i||hi===i||distance(points[lo],p)<minDistance||distance(points[hi],p)<minDistance)return null;
    const a=points[lo],b=points[hi];return Math.atan2((p.x-a.x)*(b.y-p.y)-(p.y-a.y)*(b.x-p.x),(p.x-a.x)*(b.x-p.x)+(p.y-a.y)*(b.y-p.y))*180/Math.PI;
  }
  function smooth(points,win) {
    const half=Math.floor(win/2);
    return points.map((p,i)=>{
      if(!accepted(p)||p.status==='manual') return {...p};
      let lo=i,hi=i;
      while(lo>Math.max(0,i-half)&&linked(points[lo-1],points[lo])) lo--;
      while(hi<Math.min(points.length-1,i+half)&&linked(points[hi],points[hi+1])) hi++;
      let x=0,y=0; for(let j=lo;j<=hi;j++){x+=points[j].x;y+=points[j].y;}
      return {...p,x:x/(hi-lo+1),y:y/(hi-lo+1)};
    });
  }
  function candidates(cv,rgba,reference,crop) {
    if(reference){
      if(reference.polarity==='dark'){
        const threshold=reference.threshold||120;
        const primary=segmentCandidates(cv,rgba,reference,crop,threshold,'dark');
        const narrow=segmentCandidates(cv,rgba,reference,crop,Math.max(60,threshold-20),'dark');
        return [...primary,...narrow.filter(p=>!primary.some(q=>distance(p,q)<Math.max(p.length,q.length)/2))];
      }
      const threshold=reference.threshold||220;
      const primary=segmentCandidates(cv,rgba,reference,crop,threshold);
      const shadow=segmentCandidates(cv,rgba,reference,crop,Math.max(80,threshold-40));
      // Low-threshold contours often include stationary dish markings. A
      // shadow is useful only if it retains the selected animal's contrast.
      const minContrast=Math.max(18,(reference.contrast||18)*.7);
      const base=[...primary,...shadow.filter(p=>p.contrast>=minContrast&&!primary.some(q=>distance(p,q)<Math.max(p.length,q.length)/2))];
      // A brighter silhouette can separate the animal from a touching scratch.
      // Keep all reference shape/colour limits; never replace a matching base blob.
      const highlights=segmentCandidates(cv,rgba,reference,crop,Math.min(245,threshold+20));
      return [...base,...highlights.filter(p=>p.contrast>=18&&!base.some(q=>distance(p,q)<Math.max(p.length,q.length)/2))];
    }
    const bright=segmentCandidates(cv,rgba,null,crop,220),adaptive=segmentCandidates(cv,rgba,null,crop,150);
    const dark=segmentCandidates(cv,rgba,null,crop,120,'dark');
    // Prefer the clean bright silhouette when both thresholds describe one body.
    // Retain lower-contrast candidates elsewhere; do not require a large animal.
    return [...bright,...adaptive.filter(p=>!bright.some(q=>distance(p,q)<Math.max(p.length,q.length)/2)),...dark].sort((a,b)=>b.area-a.area);
  }
  function segmentCandidates(cv,rgba,reference,crop,floor,polarity='bright') {
    const gray=new cv.Mat(), mask=new cv.Mat(), contours=new cv.MatVector(), hierarchy=new cv.Mat();
    try {
      cv.cvtColor(rgba,gray,cv.COLOR_RGBA2GRAY);
      const otsu=cv.threshold(gray,mask,0,255,cv.THRESH_BINARY+cv.THRESH_OTSU);
      // Cream larvae are brighter than the substrate. Opening removes thin scratches.
      const threshold=polarity==='dark'?floor:reference?floor:Math.max(otsu,floor);
      cv.threshold(gray,mask,threshold,255,polarity==='dark'?cv.THRESH_BINARY_INV:cv.THRESH_BINARY);
      const size=3;
      const kernel=cv.getStructuringElement(cv.MORPH_ELLIPSE,new cv.Size(size,size));
      try{cv.morphologyEx(mask,mask,cv.MORPH_OPEN,kernel);}finally{kernel.delete();}
      cv.findContours(mask,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
      const out=[], imageArea=rgba.rows*rgba.cols;
      for(let i=0;i<contours.size();i++) {
        const c=contours.get(i);
        try {
          const area=cv.contourArea(c), rect=cv.minAreaRect(c), length=Math.max(rect.size.width,rect.size.height), width=Math.min(rect.size.width,rect.size.height);
          if(area<10||area>imageArea*.08||width<1.5||length/width<1.35||length/width>10) continue;
          const m=cv.moments(c); if(!m.m00) continue;
          const x=m.m10/m.m00,y=m.m01/m.m00;
          if(crop&&(x<crop.x||y<crop.y||x>crop.x+crop.w||y>crop.y+crop.h)) continue;
          // Mean colour from contour pixels, rather than the background at a curved body's centre.
          let r=0,g=0,b=0,n=0;
          for(let j=0;j<c.data32S.length;j+=2){const off=(c.data32S[j+1]*rgba.cols+c.data32S[j])*4;r+=rgba.data[off];g+=rgba.data[off+1];b+=rgba.data[off+2];n++;}
          const colour=[r/n,g/n,b/n];
          const surround=[];
          for(let j=0;j<16;j++){
            const sx=Math.round(x+Math.cos(j*Math.PI/8)*length*.8),sy=Math.round(y+Math.sin(j*Math.PI/8)*length*.8);
            if(sx>=0&&sy>=0&&sx<rgba.cols&&sy<rgba.rows)surround.push(gray.data[sy*rgba.cols+sx]);
          }
          surround.sort((a,b)=>a-b);
          const brightness=.299*colour[0]+.587*colour[1]+.114*colour[2];
          const background=surround[Math.floor(surround.length/2)]??0;
          const contrast=polarity==='dark'?background-brightness:brightness-background;
          if(contrast<(reference?Math.max(18,(reference.contrast||18)*.65):18))continue;
          if(reference&&(length/reference.length<.5||length/reference.length>1.8||area/reference.area<.45||area/reference.area>2.5||Math.hypot(...colour.map((v,j)=>v-reference.colour[j]))>125)) continue;
          const outline=[];for(let j=0;j<c.data32S.length;j+=2)outline.push({x:c.data32S[j],y:c.data32S[j+1]});
          out.push({x,y,area,length,width,colour,outline,threshold,contrast,polarity});
        } finally { c.delete(); }
      }
      return out.sort((a,b)=>b.area-a.area);
    } finally { gray.delete();mask.delete();contours.delete();hierarchy.delete(); }
  }
  function choose(list,center,gate) {
    const viable=list.filter(p=>!center||distance(p,center)<=gate).sort((a,b)=>center?distance(a,center)-distance(b,center):b.area-a.area);
    if(!viable.length) return null;
    // Never choose between two plausible animals solely on blob size.
    if(viable.length>1&&(!center||distance(viable[1],center)-distance(viable[0],center)<gate*.35)) return null;
    return viable[0];
  }
  function localCandidates(cv,image,reference,crop,center,radius){
    if(!center)return candidates(cv,image,reference,crop);
    const x=Math.max(0,Math.floor(center.x-radius)),y=Math.max(0,Math.floor(center.y-radius));
    const w=Math.min(image.cols-x,Math.ceil(radius*2)),h=Math.min(image.rows-y,Math.ceil(radius*2));
    if(w<4||h<4)return [];
    const view=image.roi(new cv.Rect(x,y,w,h)),roi=view.clone();
    try{return candidates(cv,roi,reference,null).map(p=>({...p,x:p.x+x,y:p.y+y,outline:p.outline.map(q=>({x:q.x+x,y:q.y+y}))})).filter(p=>!crop||(p.x>=crop.x&&p.y>=crop.y&&p.x<=crop.x+crop.w&&p.y<=crop.y+crop.h));}finally{roi.delete();view.delete();}
  }
  function flow(cv,prev,current,position,length) {
    const radius=Math.max(32,length*2),x=Math.max(0,Math.floor(position.x-radius)),y=Math.max(0,Math.floor(position.y-radius));
    const w=Math.min(prev.cols-x,Math.ceil(radius*2)),h=Math.min(prev.rows-y,Math.ceil(radius*2));
    if(w<4||h<4)return null;
    const rect=new cv.Rect(x,y,w,h),a=prev.roi(rect),b=current.roi(rect);
    try{const q=flowRegion(cv,a,b,{x:position.x-x,y:position.y-y},length);return q?{x:q.x+x,y:q.y+y}:null;}finally{a.delete();b.delete();}
  }
  function texture(cv,image,candidate) {
    if(!candidate?.outline?.length||!root.WormAnatomy?.inside)return 0;
    const gray=new cv.Mat();
    try {
      cv.cvtColor(image,gray,cv.COLOR_RGBA2GRAY);
      const xs=candidate.outline.map(p=>p.x),ys=candidate.outline.map(p=>p.y);
      const left=Math.max(0,Math.floor(Math.min(...xs))),right=Math.min(gray.cols-1,Math.ceil(Math.max(...xs)));
      const top=Math.max(0,Math.floor(Math.min(...ys))),bottom=Math.min(gray.rows-1,Math.ceil(Math.max(...ys)));
      let n=0,sum=0,squares=0;
      for(let y=top;y<=bottom;y+=3)for(let x=left;x<=right;x+=3)if(root.WormAnatomy.inside({x,y},candidate.outline)){
        const v=gray.data[y*gray.cols+x];n++;sum+=v;squares+=v*v;
      }
      return n<10?0:Math.sqrt(Math.max(0,squares/n-(sum/n)**2));
    } finally {gray.delete();}
  }
  function flowRegion(cv,prev,current,position,length,exclude=null) {
    // Small animals need their original pixels; whole-frame reduction erases them.
    const scale=length<60?1:Math.min(1,640/Math.max(prev.rows,prev.cols));
    position={x:position.x*scale,y:position.y*scale};length*=scale;
    const w=Math.round(prev.cols*scale),h=Math.round(prev.rows*scale);
    const a=new cv.Mat(),b=new cv.Mat(),mask=cv.Mat.zeros(h,w,cv.CV_8UC1);
    const points=new cv.Mat(),next=new cv.Mat(),status=new cv.Mat(),err=new cv.Mat(),back=new cv.Mat(),backStatus=new cv.Mat(),backErr=new cv.Mat();
    try {
      cv.cvtColor(prev,a,cv.COLOR_RGBA2GRAY);cv.cvtColor(current,b,cv.COLOR_RGBA2GRAY);
      if(scale<1){cv.resize(a,a,new cv.Size(w,h));cv.resize(b,b,new cv.Size(w,h));}
      cv.circle(mask,new cv.Point(position.x,position.y),Math.max(5,Math.round(length*.65)),new cv.Scalar(255),-1);
      if(exclude)cv.circle(mask,new cv.Point(exclude.x*scale,exclude.y*scale),Math.max(15,Math.round(exclude.length*2*scale)),new cv.Scalar(0),-1);
      cv.goodFeaturesToTrack(a,points,40,.01,length<30?1:3,mask);
      if(points.rows<(exclude?10:3)) return null;
      cv.calcOpticalFlowPyrLK(a,b,points,next,status,err);
      cv.calcOpticalFlowPyrLK(b,a,next,back,backStatus,backErr);
      const dx=[],dy=[];
      for(let i=0;i<points.rows;i++) if(status.data[i]&&backStatus.data[i]&&Math.hypot(points.data32F[2*i]-back.data32F[2*i],points.data32F[2*i+1]-back.data32F[2*i+1])<=Math.max(1,length*.03)) {
        dx.push(next.data32F[2*i]-points.data32F[2*i]);dy.push(next.data32F[2*i+1]-points.data32F[2*i+1]);
      }
      if(dx.length<(exclude?10:3)) return null;
      dx.sort((x,y)=>x-y);dy.sort((x,y)=>x-y);
      return {x:(position.x+dx[Math.floor(dx.length/2)])/scale,y:(position.y+dy[Math.floor(dy.length/2)])/scale};
    } finally { for(const m of [a,b,mask,points,next,status,err,back,backStatus,backErr]) m.delete(); }
  }
  function cameraMotion(cv,previous,current,animal){
    const center={x:previous.cols/2,y:previous.rows/2};
    const p=flowRegion(cv,previous,current,center,Math.hypot(previous.cols,previous.rows),animal);
    return p?distance(p,center):null;
  }
  root.WormTracker={Job,Cancelled,distance,accepted,linked,proximity,fiveFrameConsistency,segmentFallback,intervals,reconcile,anchors,turnAt,smooth,candidates,localCandidates,choose,flow,texture,cameraMotion};
  if(typeof module!=='undefined') module.exports=root.WormTracker;
})(typeof window==='undefined'?globalThis:window);
