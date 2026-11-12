/* Projected-area comparison. Keeps only one raster mask at a time. */
(function(root){
  'use strict';
  const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  const angleGap=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function orientation(anatomy,previousAngle=null){
    const line=anatomy?.line,head=anatomy?.head,tail=anatomy?.tail;
    const a=finite(head)&&finite(tail)?tail:line?.[0];
    const b=finite(head)&&finite(tail)?head:line?.at(-1);
    if(!finite(a)||!finite(b)||Math.hypot(b.x-a.x,b.y-a.y)<2)return null;
    let angle=Math.atan2(b.y-a.y,b.x-a.x);
    if(Number.isFinite(previousAngle)&&Math.abs(angleGap(angle,previousAngle))>Math.PI/2)angle+=Math.PI;
    return Math.atan2(Math.sin(angle),Math.cos(angle));
  }
  function raster(anatomy,previousAngle=null){
    if(!anatomy?.outline?.length||!finite(anatomy.center))return null;
    const angle=orientation(anatomy,previousAngle);if(angle===null)return null;
    const cosine=Math.cos(angle),sine=Math.sin(angle),center=anatomy.center;
    const polygon=anatomy.outline.map(p=>({x:(p.x-center.x)*cosine+(p.y-center.y)*sine,
      y:-(p.x-center.x)*sine+(p.y-center.y)*cosine}));
    if(polygon.some(p=>!finite(p)))return null;
    const ys=polygon.map(p=>p.y),minY=Math.floor(Math.min(...ys)),maxY=Math.ceil(Math.max(...ys));
    const xs=polygon.map(p=>p.x),width=Math.ceil(Math.max(...xs))-Math.floor(Math.min(...xs));
    if(width<1||maxY-minY<1||width*(maxY-minY)>250000)return null;
    const keys=new Set(),cells=[];
    for(let y=minY;y<maxY;y++){
      const row=y+.5,edges=[];
      for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const a=polygon[j],b=polygon[i];
        if((a.y<=row&&b.y>row)||(b.y<=row&&a.y>row))edges.push(a.x+(row-a.y)*(b.x-a.x)/(b.y-a.y));
      }
      edges.sort((a,b)=>a-b);
      for(let k=0;k+1<edges.length;k+=2){
        const from=Math.ceil(edges[k]-.5),to=Math.floor(edges[k+1]-.5);
        for(let x=from;x<=to;x++){const key=`${x},${y}`;keys.add(key);cells.push({x,y,key});}
      }
    }
    return cells.length?{center,angle,keys,cells,area:cells.length}:null;
  }
  function compare(current,baseline,previous=null){
    if(!current||!baseline)return null;
    const earlier=[],recent=[];
    for(const cell of current.cells){
      if(previous&&!previous.keys.has(cell.key))recent.push(cell);
      else if(previous&&!baseline.keys.has(cell.key))earlier.push(cell);
    }
    return {area:current.area,baselineArea:baseline.area,delta:current.area-baseline.area,
      recentDelta:previous?current.area-previous.area:0,
      earlierArea:earlier.length,recentArea:recent.length,earlier,recent};
  }
  function measurement(mmPerPixel,unit,units){
    const calibrated=Number.isFinite(mmPerPixel)&&mmPerPixel>0&&Number.isFinite(units?.[unit])&&units[unit]>0;
    return{factor:calibrated?(mmPerPixel/units[unit])**2:1,unit:calibrated?(unit==='um'?'µm':unit)+'²':'px²'};
  }
  function summary(samples){if(!samples.length)return null;let sum=0,min=Infinity,max=-Infinity,n=0;for(const s of samples)if(Number.isFinite(s.area)&&s.area>0){sum+=s.area;min=Math.min(min,s.area);max=Math.max(max,s.area);n++;}return n?{mean:sum/n,min,max,count:n}:null;}
  const api={orientation,raster,compare,measurement,summary};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.WormAreaChange=api;
})(typeof window!=='undefined'?window:globalThis);
