/* Local geometry and conservative landmark identity. No learned anatomical model. */
(function(root){
  'use strict';
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const angle=(a,b)=>Math.atan2(a.x*b.y-a.y*b.x,a.x*b.x+a.y*b.y)*180/Math.PI;
  function inside(p,polygon){
    let hit=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
    }return hit;
  }
  // Source-coordinate, bounded display contour. Uniform arc spacing removes
  // pixel-grid sampling bias; two local passes remove stairs without scaling
  // the animal or changing the authoritative measured contour.
  function smoothBoundary(outline, maxShift=.65){
    if(!outline||outline.length<6)return outline||[];
    const lengths=[0];for(let i=0;i<outline.length;i++)lengths.push(lengths.at(-1)+dist(outline[i],outline[(i+1)%outline.length]));
    const perimeter=lengths.at(-1);if(!perimeter)return outline;
    const count=Math.min(2048,Math.max(12,Math.ceil(perimeter))),raw=[];let edge=0;
    for(let i=0;i<count;i++){const target=i*perimeter/count;while(edge<outline.length-1&&lengths[edge+1]<target)edge++;const a=outline[edge],b=outline[(edge+1)%outline.length],t=(target-lengths[edge])/(lengths[edge+1]-lengths[edge]||1);raw.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
    let points=raw;
    for(let pass=0;pass<2;pass++)points=points.map((p,i)=>{const a=points[(i+count-1)%count],b=points[(i+1)%count],q={x:(a.x+2*p.x+b.x)/4,y:(a.y+2*p.y+b.y)/4},r=raw[i],d=dist(q,r),f=d>maxShift?maxShift/d:1;return{x:r.x+(q.x-r.x)*f,y:r.y+(q.y-r.y)*f};});
    return points;
  }
  // Restricted subpixel edge search, never a free-form or model-generated mask.
  function refineBoundary(outline, sample){
    const points=smoothBoundary(outline),n=points.length;
    if(n<6||!sample)return points;
    const refined=points.map((p,i)=>{const a=points[(i+n-2)%n],b=points[(i+2)%n],d=dist(a,b);if(!d)return p;
      const nx=-(b.y-a.y)/d,ny=(b.x-a.x)/d;
      const gradient=t=>Math.abs(sample(p.x+nx*(t+.65),p.y+ny*(t+.65))-sample(p.x+nx*(t-.65),p.y+ny*(t-.65)));
      let best=gradient(0),offset=0;
      // Search the local source-pixel edge, rather than polishing only the
      // thresholded bright core. A distance penalty keeps nearby clutter from
      // winning merely by having slightly higher contrast. Flat images do not expand.
      for(let t=-1.5;t<=1.5;t+=.25){const g=gradient(t)-Math.abs(t)*1.5;if(g>best+2){best=g;offset=t;}}
      return{x:p.x+nx*offset,y:p.y+ny*offset};
    });
    // Independent edge offsets can reintroduce stairs; regularize only within
    // a quarter source pixel after alignment, never in screen coordinates.
    return smoothBoundary(refined,.25);
  }
  function geometry(outline){
    if(!outline||outline.length<6)return null;
    const minX=Math.min(...outline.map(p=>p.x)),minY=Math.min(...outline.map(p=>p.y));
    const dx=Math.max(...outline.map(p=>p.x))-minX,dy=Math.max(...outline.map(p=>p.y))-minY;
    const scale=Math.max(dx,dy)<48?.5:Math.max(1,Math.max(dx,dy)/96),w=Math.ceil(dx/scale)+5,h=Math.ceil(dy/scale)+5;
    const toPoint=i=>({x:minX+(i%w-2)*scale,y:minY+(Math.floor(i/w)-2)*scale});
    const pixels=new Uint8Array(w*h);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)pixels[y*w+x]=inside(toPoint(y*w+x),outline)?1:0;
    const offsets=[-w,-w+1,1,w+1,w,w-1,-1,-w-1];
    // Zhang-Suen thinning keeps topology while reducing the silhouette to a skeleton.
    for(let iter=0;iter<100;iter++){
      let changed=0;
      for(let phase=0;phase<2;phase++){
        const remove=[];
        for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
          const i=y*w+x;if(!pixels[i])continue;
          const n=offsets.map(o=>pixels[i+o]),sum=n.reduce((a,b)=>a+b,0);
          if(sum<2||sum>6)continue;
          let transitions=0;for(let j=0;j<8;j++)if(!n[j]&&n[(j+1)%8])transitions++;
          if(transitions!==1)continue;
          if(phase===0?(n[0]*n[2]*n[4]||n[2]*n[4]*n[6]):(n[0]*n[2]*n[6]||n[0]*n[4]*n[6]))continue;
          remove.push(i);
        }
        for(const i of remove)pixels[i]=0;changed+=remove.length;
      }if(!changed)break;
    }
    const nodes=[];for(let i=0;i<pixels.length;i++)if(pixels[i])nodes.push(i);
    if(nodes.length<5)return null;
    // A diagonal beside an orthogonal connection is a redundant shortcut, not
    // another skeleton branch. Keep isolated diagonals to preserve connectivity.
    const adjacent=i=>offsets.filter((o,k)=>pixels[i+o]&&(!(k%2)||(!pixels[i+offsets[k-1]]&&!pixels[i+offsets[(k+1)%8]])));
    const ends=nodes.filter(i=>adjacent(i).length===1);
    if(ends.length<2)return null; // loops/folds cannot provide trustworthy endpoints
    function search(start){
      const queue=[start],parents=new Map([[start,-1]]);let far=start;
      for(let k=0;k<queue.length;k++){const i=queue[k];far=i;for(const o of adjacent(i))if(!parents.has(i+o)){parents.set(i+o,i);queue.push(i+o);}}
      return{far,parents};
    }
    const start=search(ends[0]).far,{far,parents}=search(start),path=[];
    for(let i=far;i!==-1;i=parents.get(i))path.push(toPoint(i));
    if(path.length/nodes.length<.75)return null; // substantial branches remain ambiguous
    // Extend medial endpoints along their local tangent to the contour boundary.
    for(const reverse of [false,true]){
      if(reverse)path.reverse();
      const a=path[0],b=path[Math.min(5,path.length-1)],d=dist(a,b);
      if(d){let p=a;for(let k=1;k<30;k++){const q={x:a.x+(a.x-b.x)/d*k*scale,y:a.y+(a.y-b.y)/d*k*scale};if(!inside(q,outline))break;p=q;}path[0]=p;}
      if(reverse)path.reverse();
    }
    const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+dist(path[i-1],path[i]));
    const length=lengths.at(-1);if(length<5)return null;
    const line=[];for(let j=0;j<=20;j++){const target=length*j/20;let i=1;while(i<lengths.length-1&&lengths[i]<target)i++;const t=(target-lengths[i-1])/(lengths[i]-lengths[i-1]||1);line.push({x:path[i-1].x+(path[i].x-path[i-1].x)*t,y:path[i-1].y+(path[i].y-path[i-1].y)*t});}
    return {outline,line,center:line[10],ends:[line[0],line[20]],length,status:'estimated'};
  }
  function agree(a,b,length){
    return !!a&&!!b&&dist(a.center,b.center)<=length*.1&&Math.min(dist(a.ends[0],b.ends[0])+dist(a.ends[1],b.ends[1]),dist(a.ends[0],b.ends[1])+dist(a.ends[1],b.ends[0]))<=length*.25;
  }
  function orient(points,seeds,fps=30){
    for(const p of points)if(p.anatomy){delete p.anatomy.head;delete p.anatomy.tail;delete p.anatomy.headAngle;delete p.anatomy.headOrigin;delete p.anatomy.tailOrigin;p.anatomy.headStatus='unassigned';}
    for(const seed of seeds){
      const at=points.findIndex(p=>p.frame===seed.frame&&p.status!=='uncertain'&&p.anatomy);if(at<0)continue;
      const g=points[at].anatomy,ds=g.ends.map(p=>dist(p,seed));if(Math.min(...ds)>g.length*.25)continue;
      const nearest=ds[0]<ds[1]?0:1,first=seed.kind==='tail'?1-nearest:nearest;
      for(const dir of [-1,1]){
        let previous=null;
        for(let i=at;i>=0&&i<points.length;i+=dir){
          const p=points[i],a=p.anatomy;if(p.status==='uncertain'||!a||previous&&Math.abs(p.frame-previous.frame)!==1)break;
          if(i!==at&&seeds.some(s=>s.frame===p.frame))break;
          let k=first;
          if(previous){
            const old=previous.anatomy,delta={x:a.center.x-old.center.x,y:a.center.y-old.center.y};
            const predict={x:old.head.x+delta.x,y:old.head.y+delta.y},ds=a.ends.map(e=>dist(e,predict));
            k=ds[0]<ds[1]?0:1;
            if(Math.abs(ds[0]-ds[1])<a.length*.15||ds[k]>a.length*.3)break;
          }
          const head=a.ends[k],tail=a.ends[1-k];
          if(a.head&&dist(a.head,head)>a.length*.25){delete a.head;delete a.tail;delete a.headAngle;a.headStatus='conflict';break;}
          a.head=head;a.tail=tail;a.headStatus=seed.origin==='auto'?'motion inferred':i===at?'manual':'tracked';
          a.headOrigin=i===at&&seed.origin!=='auto'&&seed.kind!=='tail'?'manual':'auto';
          a.tailOrigin=i===at&&seed.origin!=='auto'&&seed.kind==='tail'?'manual':'auto';
          if(i===at&&seed.origin!=='auto'){a[seed.kind==='tail'?'tail':'head']={x:seed.x,y:seed.y};}
          const neck=a.line[k===0?5:15];
          a.headAngle=angle({x:a.center.x-a.tail.x,y:a.center.y-a.tail.y},{x:a.head.x-neck.x,y:a.head.y-neck.y});
          previous=p;
        }
      }
    }
    // A usable body center can survive a few frames without a skeleton.
    // Carry head identity to the next clear outline using endpoint continuity,
    // but never assign head coordinates to the missing-outline frames or cross
    // an uncertain center/gap.
    const maxGap=Math.max(2,Math.round(fps*.5));
    for(const direction of [1,-1])for(let i=direction>0?0:points.length-1;i>=0&&i<points.length;i+=direction){
      const p=points[i],a=p.anatomy;
      if(p.status==='uncertain'||!a||a.head)continue;
      let source=null;
      for(let j=i-direction;j>=0&&j<points.length&&Math.abs(p.frame-points[j].frame)<=maxGap;j-=direction){
        const q=points[j];
        if(q.status==='uncertain'||Math.abs(q.frame-points[j+direction].frame)!==1)break;
        if(q.anatomy?.head){source=q;break;}
      }
      if(!source)continue;
      const old=source.anatomy,predict={x:old.head.x+a.center.x-old.center.x,y:old.head.y+a.center.y-old.center.y};
      const d=a.ends.map(e=>dist(e,predict)),k=d[0]<d[1]?0:1;
      if(d[k]>a.length*.45||Math.abs(d[0]-d[1])<a.length*.15)continue;
      a.head=a.ends[k];a.tail=a.ends[1-k];a.headStatus='tracked';a.headOrigin='auto';a.tailOrigin='auto';
      const neck=a.line[k===0?5:15];
      a.headAngle=angle({x:a.center.x-a.tail.x,y:a.center.y-a.tail.y},{x:a.head.x-neck.x,y:a.head.y-neck.y});
    }
    return points;
  }
  function infer(points,fps){
    const seeds=[];
    for(let start=0;start<points.length;){
      let end=start;
      while(end<points.length&&points[end].status!=='uncertain'&&(end===start||points[end].frame===points[end-1].frame+1))end++;
      if(end===start){start++;continue;}
      // Require a sustained, body-aligned displacement. Head identity then follows
      // geometry, not instantaneous velocity (which may reverse).
      let found=false;
      for(const span of [...new Set([.5,1,2].map(t=>Math.max(3,Math.round(fps*t))))]){
      for(let i=start;i+span<end;i++){
        const a=points[i].anatomy;if(!a)continue;
        const endIndex=[i+span,i+span-1,i+span+1,i+span-2,i+span+2].find(j=>j<end&&points[j]?.anatomy);
        if(endIndex===undefined)continue;
        const b=points[endIndex].anatomy,dx=b.center.x-a.center.x,dy=b.center.y-a.center.y,d=Math.hypot(dx,dy);
        if(d<Math.max(2,a.length*.2))continue;
        const scores=a.ends.map(e=>((e.x-a.center.x)*dx+(e.y-a.center.y)*dy)/(dist(e,a.center)*d||1));
        const k=scores[0]>scores[1]?0:1;
        const mid=points[i+Math.floor((endIndex-i)/2)],midCenter=mid.anatomy?.center||{x:mid.x,y:mid.y};
        if(scores[k]<.75||((midCenter.x-a.center.x)*dx+(midCenter.y-a.center.y)*dy)<=0)continue;
        seeds.push({...a.ends[k],frame:points[i].frame,origin:'auto'});found=true;break;
      }
      if(found)break;
      }
      start=end;
    }
    return seeds;
  }
  // Review-only landmark estimate. Use observations on both sides of the
  // current frame; never turn an uncertain center into a verified sample.
  function temporalLandmarks(points,frame,radius=5,unavailable=[]){
    const at=points.findIndex(p=>p.frame===frame);if(at<0||unavailable.some(r=>r.start<=frame&&frame<=r.end))return null;
    const current=points[at],usable=p=>p?.status!=='uncertain'&&p?.anatomy?.head&&p.anatomy.tail&&!unavailable.some(r=>r.start<=Math.max(p.frame,frame)&&r.end>=Math.min(p.frame,frame));
    const before=points.slice(Math.max(0,at-radius),at).filter(p=>frame-p.frame<=radius&&usable(p));
    const after=points.slice(at+1,at+radius+1).filter(p=>p.frame-frame<=radius&&usable(p));
    const left=before.at(-1),right=after[0];
    if(!left||!right||unavailable.some(r=>r.start<=right.frame&&r.end>=left.frame))return null;
    const length=(left.anatomy.length+right.anatomy.length)/2;
    if(!(length>0)||dist(left,right)>length*4)return null;
    const offset=(p,key)=>({x:p.anatomy[key].x-p.anatomy.center.x,y:p.anatomy[key].y-p.anatomy.center.y});
    const lh=offset(left,'head'),rh=offset(right,'head'),lt=offset(left,'tail'),rt=offset(right,'tail');
    if(lh.x*rh.x+lh.y*rh.y<0||lt.x*rt.x+lt.y*rt.y<0)return null;
    const samples=[...before,...after];
    const fit=read=>{
      let weight=0,time=0,value=0,time2=0,timeValue=0;
      for(const p of samples){const dt=p.frame-frame,w=1/(1+Math.abs(dt)),v=read(p);weight+=w;time+=w*dt;value+=w*v;time2+=w*dt*dt;timeValue+=w*dt*v;}
      const denom=weight*time2-time*time;
      return denom>1e-9?(value*time2-time*timeValue)/denom:value/weight;
    };
    const center=current.status!=='uncertain'?{x:current.x,y:current.y}:{x:fit(p=>p.x),y:fit(p=>p.y)};
    const headOffset={x:fit(p=>offset(p,'head').x),y:fit(p=>offset(p,'head').y)};
    const tailOffset={x:fit(p=>offset(p,'tail').x),y:fit(p=>offset(p,'tail').y)};
    let head={x:center.x+headOffset.x,y:center.y+headOffset.y},tail={x:center.x+tailOffset.x,y:center.y+tailOffset.y};
    if(current.status!=='uncertain'&&current.anatomy?.ends?.length===2){
      const ends=current.anatomy.ends,d=ends.map(e=>dist(e,head)),k=d[0]<d[1]?0:1;
      if(d[k]>length*.45||Math.abs(d[0]-d[1])<length*.15)return null;
      head=ends[k];tail=ends[1-k];
    }
    if(dist(head,tail)<length*.3||dist(head,tail)>length*1.25)return null;
    return {center,head,tail,centerEstimated:current.status==='uncertain',from:[left.frame,right.frame]};
  }
  function fields(p,previous,fps){
    const a=p.status!=='uncertain'?p.anatomy:null;
    const center=p.status&&p.status!=='uncertain'?{x:p.x,y:p.y}:null;
    const centerSpeed=center&&previous?.status&&previous.status!=='uncertain'&&p.frame-previous.frame===1?
      dist(center,previous)*fps:'';
    const speed=(key)=>a?.[key]&&previous?.status!=='uncertain'&&previous?.anatomy?.[key]&&p.frame-previous.frame===1?dist(a[key],previous.anatomy[key])*fps:'';
    const relative=key=>{if(speed(key)==='')return '';const old=previous.anatomy;return Math.hypot((a[key].x-a.center.x)-(old[key].x-old.center.x),(a[key].y-a.center.y)-(old[key].y-old.center.y))*fps;};
    return {outline_status:a?'two-pass consistent':'unavailable',center_status:p.status||'unavailable',center_origin:p.origin||'auto',center_x_px:center?.x??'',center_y_px:center?.y??'',center_speed_px_s:centerSpeed,centerline_length_px:a?.length??'',head_status:a?.headStatus||'unavailable',head_origin:a?.headOrigin||'',head_x_px:a?.head?.x??'',head_y_px:a?.head?.y??'',head_speed_px_s:speed('head'),head_relative_speed_px_s:relative('head'),head_bend_deg:a?.headAngle??'',tail_status:a?.tail?a.headStatus:'unavailable',tail_origin:a?.tailOrigin||'',tail_x_px:a?.tail?.x??'',tail_y_px:a?.tail?.y??'',tail_speed_px_s:speed('tail'),tail_relative_speed_px_s:relative('tail')};
  }
  root.WormAnatomy={smoothBoundary,refineBoundary,geometry,agree,orient,infer,temporalLandmarks,fields,inside};
  if(typeof module!=='undefined')module.exports=root.WormAnatomy;
})(typeof window==='undefined'?globalThis:window);
