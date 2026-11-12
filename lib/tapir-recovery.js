/* Bounded TAPIR search hints. No model output is a verified body center. */
(function(root){
  'use strict';
  const median=values=>{const a=[...values].sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function cropFor(a,b,length,width,height){
    if(!a||!b||!(length>0)||!(width>0)||!(height>0))return null;
    const desired=Math.max(length*3,distance(a,b)+length*2);
    const size=Math.min(512,Math.max(128,Math.ceil(desired)));
    if(size>Math.min(width,height))return null;
    const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const x=Math.max(0,Math.min(width-size,Math.round(center.x-size/2)));
    const y=Math.max(0,Math.min(height-size,Math.round(center.y-size/2)));
    if([a,b].some(p=>p.x<x||p.y<y||p.x>=x+size||p.y>=y+size))return null;
    return {x,y,size};
  }
  function seedsFor(anchor,roi,inside){
    const line=anchor?.anatomy?.line;
    if(!line||line.length<13)return [];
    const centers=[line[8],line[10],line[12]].filter(p=>p&&(!inside||inside(p,anchor.anatomy.outline)));
    return centers.map(p=>({source:{x:p.x,y:p.y},query:[(p.x-roi.x)*256/roi.size,(p.y-roi.y)*256/roi.size]}))
      .filter(p=>p.query.every(v=>v>=0&&v<256));
  }
  // Preserve both anchors while limiting CPU inference to 24 images per gap.
  function sampleFrames(start,end){
    const count=Math.min(24,end-start+1);
    return Array.from({length:count},(_,i)=>start+Math.round(i*(end-start)/Math.max(1,count-1)));
  }
  function hintsFromTrack(output,seeds,roi,anchor,bodyLength,startFrame,endAnchor,sampledFrames){
    if(!output||!Array.isArray(output.positions)||!Array.isArray(output.visible)||output.positions.length!==seeds.length||output.visible.length!==seeds.length)return null;
    const frames=sampledFrames??Array.from({length:endAnchor.frame-startFrame+1},(_,i)=>startFrame+i);
    if(frames[0]!==startFrame||frames.at(-1)!==endAnchor.frame||
       frames.some((frame,i)=>!Number.isInteger(frame)||(i>0&&frame<=frames[i-1])))return null;
    const count=output.positions[0]?.length;
    if(!count||count!==frames.length||output.positions.some(row=>row.length!==count)||output.visible.some(row=>row.length!==count))return null;
    const hints=new Map();
    for(let t=0;t<count;t++){
      const deltas=[];
      for(let i=0;i<seeds.length;i++){
        if(!output.visible[i]?.[t])continue;
        const point=output.positions[i][t];
        if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))continue;
        deltas.push({x:(point[0]-seeds[i].query[0])*roi.size/256,
                     y:(point[1]-seeds[i].query[1])*roi.size/256});
      }
      if(deltas.length<2)continue;
      const dx=median(deltas.map(p=>p.x)),dy=median(deltas.map(p=>p.y));
      if(deltas.some(p=>Math.hypot(p.x-dx,p.y-dy)>bodyLength/4))continue;
      hints.set(frames[t],{x:anchor.x+dx,y:anchor.y+dy});
    }
    // Interpolate only between adjacent samples with agreeing, visible seeds.
    // These are search hints. The caller verifies every original frame.
    for(let i=1;i<frames.length;i++){
      const left=frames[i-1],right=frames[i],a=hints.get(left),b=hints.get(right);
      if(!a||!b)continue;
      for(let frame=left+1;frame<right;frame++){
        const fraction=(frame-left)/(right-left);
        hints.set(frame,{x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction});
      }
    }
    const endpoint=hints.get(endAnchor.frame);
    if(!endpoint||distance(endpoint,endAnchor)>bodyLength/2)return null;
    let last={frame:startFrame,...anchor};
    for(let t=1;t<=endAnchor.frame-startFrame;t++){
      const p=hints.get(startFrame+t),previous=hints.get(startFrame+t-1),twoBack=hints.get(startFrame+t-2);
      if(p&&previous&&distance(p,previous)>Math.max(4,bodyLength*.5))return null;
      if(p&&twoBack&&distance(p,twoBack)>bodyLength)return null;
      if(p&&distance(p,last)>Math.max(4,bodyLength*.5)*(startFrame+t-last.frame))return null;
      if(p)last={frame:startFrame+t,...p};
    }
    return hints;
  }
  root.WormTapirRecovery={cropFor,seedsFor,sampleFrames,hintsFromTrack};
  if(typeof module!=='undefined')module.exports=root.WormTapirRecovery;
})(typeof window==='undefined'?globalThis:window);
