/* Binary reference-area masks. PhotoCraft selection semantics informed this small
 * browser implementation; see PhotoCraft-LICENSE.txt and DEPENDENCIES.md. */
(function(root){
  'use strict';
  function combine(a,b,mode='replace'){
    const out=new Uint8Array(b.length);
    for(let i=0;i<out.length;i++)out[i]=mode==='add'?Number(!!a?.[i]||!!b[i]):mode==='subtract'?Number(!!a?.[i]&&!b[i]):mode==='intersect'?Number(!!a?.[i]&&!!b[i]):Number(!!b[i]);
    return out;
  }
  function shape(w,h,tool,points){
    const out=new Uint8Array(w*h);if(points.length<2)return out;
    const a=points[0],b=points.at(-1),x0=Math.max(0,Math.min(a.x,b.x)),x1=Math.min(w,Math.max(a.x,b.x)),y0=Math.max(0,Math.min(a.y,b.y)),y1=Math.min(h,Math.max(a.y,b.y));
    if(tool==='lasso'){
      if(points.length<3)return out;
      const lo=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))),hi=Math.min(h,Math.ceil(Math.max(...points.map(p=>p.y))));
      for(let y=lo;y<hi;y++){
        const edges=[],py=y+.5;
        for(let i=0,j=points.length-1;i<points.length;j=i++){
          const p=points[i],q=points[j];if((p.y>py)!==(q.y>py))edges.push(p.x+(py-p.y)*(q.x-p.x)/(q.y-p.y));
        }
        edges.sort((a,b)=>a-b);for(let i=0;i+1<edges.length;i+=2)out.fill(1,y*w+Math.max(0,Math.ceil(edges[i]-.5)),y*w+Math.min(w,Math.ceil(edges[i+1]-.5)));
      }
    }else if(x1>x0&&y1>y0){
      const cx=(x0+x1)/2,cy=(y0+y1)/2,rx=(x1-x0)/2,ry=(y1-y0)/2;
      for(let y=Math.max(0,Math.ceil(y0-.5));y<Math.min(h,Math.ceil(y1-.5));y++)for(let x=Math.max(0,Math.ceil(x0-.5));x<Math.min(w,Math.ceil(x1-.5));x++)if(tool!=='ellipse'||((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1)out[y*w+x]=1;
    }
    return out;
  }
  function wand(image,x,y,tolerance=24,contiguous=true){
    const {width:w,height:h,data}=image,out=new Uint8Array(w*h);x=Math.floor(x);y=Math.floor(y);if(x<0||x>=w||y<0||y>=h)return out;
    const seed=y*w+x,s=seed*4,t=Math.max(0,Math.min(255,tolerance)),match=i=>{const j=i*4;return data[s+3]===0&&data[j+3]===0||Math.max(Math.abs(data[j]-data[s]),Math.abs(data[j+1]-data[s+1]),Math.abs(data[j+2]-data[s+2]),Math.abs(data[j+3]-data[s+3]))<=t;};
    if(!contiguous){for(let i=0;i<out.length;i++)if(match(i))out[i]=1;return out;}
    const queue=new Int32Array(w*h);let head=0,tail=1;queue[0]=seed;out[seed]=1;
    const visit=j=>{if(!out[j]&&match(j)){out[j]=1;queue[tail++]=j;}};
    while(head<tail){const i=queue[head++],xx=i%w;if(xx)visit(i-1);if(xx+1<w)visit(i+1);if(i>=w)visit(i-w);if(i+w<out.length)visit(i+w);}
    return out;
  }
  function boundarySegments(mask,width,height){
    const segments=[];
    for(let y=0;y<=height;y++){
      let start=-1;
      for(let x=0;x<=width;x++){
        const edge=x<width&&(!!(y>0&&mask[(y-1)*width+x])!==!!(y<height&&mask[y*width+x]));
        if(edge&&start<0)start=x;
        if(!edge&&start>=0){segments.push([start,y,x,y]);start=-1;}
      }
    }
    for(let x=0;x<=width;x++){
      let start=-1;
      for(let y=0;y<=height;y++){
        const edge=y<height&&(!!(x>0&&mask[y*width+x-1])!==!!(x<width&&mask[y*width+x]));
        if(edge&&start<0)start=y;
        if(!edge&&start>=0){segments.push([x,start,x,y]);start=-1;}
      }
    }
    return segments;
  }
  const count=mask=>mask.reduce((n,v)=>n+Number(!!v),0);
  function pack(mask){const bytes=new Uint8Array(Math.ceil(mask.length/8));for(let i=0;i<mask.length;i++)if(mask[i])bytes[i>>3]|=1<<(i&7);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return typeof btoa==='function'?btoa(binary):Buffer.from(bytes).toString('base64');}
  function unpack(bits,n){const raw=typeof atob==='function'?atob(bits):Buffer.from(bits,'base64').toString('binary'),out=new Uint8Array(n);for(let i=0;i<n;i++)out[i]=(raw.charCodeAt(i>>3)>>(i&7))&1;return out;}
  function ratio(area,value,unit){return area>0&&Number.isFinite(area)&&value>0&&Number.isFinite(value)&&unit>0&&Number.isFinite(unit)?Math.sqrt(value*unit*unit/area):null;}
  root.WormSelection={combine,shape,wand,boundarySegments,count,pack,unpack,ratio};if(typeof module!=='undefined')module.exports=root.WormSelection;
})(typeof window==='undefined'?globalThis:window);
