/* Independent implementations of published locomotion and geometry methods.
 * Track-A-Worm 2.0 inspired the measurements, not this implementation.
 * Input tracks and the authoritative 21-point centerline are never modified. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;root.WormBodyAnalysis=api;})(globalThis,function(){
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const valid=p=>p&&['verified','manual','tracked'].includes(p.status)&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  function resample(line,count=13){
    if(!line||line.length<2)return null;
    const arc=[0];for(let i=1;i<line.length;i++)arc.push(arc.at(-1)+distance(line[i-1],line[i]));
    const length=arc.at(-1);if(!(length>0))return null;let j=1;
    return Array.from({length:count},(_,i)=>{const t=length*i/(count-1);while(j<line.length-1&&arc[j]<t)j++;const u=(t-arc[j-1])/(arc[j]-arc[j-1]||1);return{x:line[j-1].x+(line[j].x-line[j-1].x)*u,y:line[j-1].y+(line[j].y-line[j-1].y)*u};});
  }
  function bends(line){return line.slice(1,-1).map((p,i)=>{const a=line[i],b=line[i+2],ux=p.x-a.x,uy=p.y-a.y,vx=b.x-p.x,vy=b.y-p.y;return Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy)*180/Math.PI;});}
  function circle(points){
    if(points.length<3)return null;
    const mx=points.reduce((s,p)=>s+p.x,0)/points.length,my=points.reduce((s,p)=>s+p.y,0)/points.length;
    let xx=0,xy=0,yy=0,xz=0,yz=0,z=0;
    for(const p of points){const x=p.x-mx,y=p.y-my,q=x*x+y*y;xx+=x*x;xy+=x*y;yy+=y*y;xz+=x*q;yz+=y*q;z+=q;}
    const det=xx*yy-xy*xy;if(Math.abs(det)<1e-10*Math.max(1,xx*yy))return{radius:Infinity,curvature:0};
    const x=(xz*yy-yz*xy)/(2*det),y=(yz*xx-xz*xy)/(2*det),radius=Math.sqrt(x*x+y*y+z/points.length);
    return Number.isFinite(radius)&&radius>0?{x:x+mx,y:y+my,radius,curvature:1/radius}:null;
  }
  function curvature(line){
    const dense=resample(line,101);if(!dense)return[];
    const angles=bends(dense),cuts=[0];let sign=0;
    for(let i=0;i<angles.length;i++){const next=Math.abs(angles[i])<1e-5?0:Math.sign(angles[i]);if(next&&sign&&next!==sign)cuts.push(i+1);if(next)sign=next;}cuts.push(dense.length-1);
    const out=[];for(let i=1;i<cuts.length;i++){const start=cuts[i-1],end=cuts[i];if(end-start<3)continue;const fit=circle(dense.slice(start,end+1));if(fit)out.push({start:start/100,end:end/100,...fit});}return out;
  }
  function spectrum(samples,fps){
    if(samples.length<32||(samples.length-1)/fps<4)return null;
    const n=samples.length,mean=samples.reduce((a,b)=>a+b,0)/n,values=samples.map((v,i)=>(v-mean)*(.5-.5*Math.cos(2*Math.PI*i/(n-1))));
    // Radix-2 FFT with zero padding; reported resolution remains fps / n.
    let size=1;while(size<n)size*=2;const re=new Float64Array(size),im=new Float64Array(size);re.set(values);
    for(let i=1,j=0;i<size;i++){let bit=size>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
    for(let len=2;len<=size;len*=2){const angle=-2*Math.PI/len;for(let i=0;i<size;i+=len)for(let j=0;j<len/2;j++){const c=Math.cos(angle*j),s=Math.sin(angle*j),k=i+j,l=k+len/2,rx=re[l]*c-im[l]*s,ix=re[l]*s+im[l]*c;re[l]=re[k]-rx;im[l]=im[k]-ix;re[k]+=rx;im[k]+=ix;}}
    let best=0,power=0;for(let i=Math.max(1,Math.ceil(size/n));i<=size/2;i++){const p=re[i]**2+im[i]**2;if(p>power){power=p;best=i;}}
    return power>1e-10?{frequency:best*fps/size,resolution:fps/n,samples:n,duration:(n-1)/fps}:null;
  }
  function analyze(track,options={}){
    const fps=options.fps||30,factor=options.factor||1,rows=[],segments=[];let segment=[];
    const direction={forwardDistance:0,backwardDistance:0,forwardTime:0,backwardTime:0,stationaryTime:0,unavailableTime:0};
    for(let i=0;i<track.length;i++){
      const p=track[i],previous=track[i-1],linked=valid(p)&&valid(previous)&&p.frame-previous.frame===1,a=valid(p)?p.anatomy:null;
      const row={frame:p.frame,time_s:p.frame/fps,verified:p.status==='verified',evidence:p.evidence||p.status,direction:'unavailable',length:null,amplitude:null,bends:null,curvature:[]};
      if(a?.line?.length){row.length=a.line.slice(1).reduce((s,q,j)=>s+distance(q,a.line[j]),0)*factor;
        if(options.curvature)row.curvature=curvature(a.line).map(c=>({...c,radius:c.radius*factor,curvature:c.curvature/factor}));
        if(a.head){let line=resample(a.line);if(line){if(distance(line[0],a.head)>distance(line.at(-1),a.head))line.reverse();if(options.bending)row.bends=bends(line);}}
      }
      if(linked){const dx=p.x-previous.x,dy=p.y-previous.y,step=Math.hypot(dx,dy),speed=step*fps;
        if(speed<=(options.stationaryPxPerSecond||0)){row.direction='stationary';direction.stationaryTime+=1/fps;}
        else if(a?.head){const projection=dx*(a.head.x-p.x)+dy*(a.head.y-p.y);row.direction=projection>0?'forward':projection<0?'backward':'lateral';if(row.direction==='forward'||row.direction==='backward'){direction[row.direction+'Distance']+=step*factor;direction[row.direction+'Time']+=1/fps;}}
        if(a?.line?.length&&step>1e-9){const values=a.line.map(q=>(-dy*(q.x-p.x)+dx*(q.y-p.y))/step);row.amplitude=(Math.max(...values)-Math.min(...values))*factor;}
      }
      if(i&&row.direction==='unavailable')direction.unavailableTime+=1/fps;
      if(row.bends){if(segment.length&&p.frame!==segment.at(-1).frame+1){segments.push(segment);segment=[];}segment.push(row);}else if(segment.length){segments.push(segment);segment=[];}
      rows.push(row);
    }
    if(segment.length)segments.push(segment);
    const rms=Array.from({length:11},(_,j)=>{const values=rows.filter(r=>r.bends).map(r=>r.bends[j]);return values.length?Math.sqrt(values.reduce((s,x)=>s+x*x,0)/values.length):null;});
    const frequencies=options.bending?segments.map(s=>({start:s[0].frame,end:s.at(-1).frame,bends:Array.from({length:11},(_,j)=>spectrum(s.map(r=>r.bends[j]),fps))})):[];
    return{version:1,unit:options.unit||'px',rows,direction,rms,frequencies,convention:'Head-to-tail; image-coordinate signed bends, not dorsal/ventral.'};
  }
  function csv(result){const header=['frame','time_s','verified','evidence','direction','length','amplitude',...Array.from({length:11},(_,i)=>'bend_'+(i+1)+'_deg'),'mean_curvature'];return[header.join(','),...result.rows.map(r=>[r.frame,r.time_s,r.verified,r.evidence,r.direction,r.length??'',r.amplitude??'',...(r.bends||Array(11).fill('')),r.curvature.length?r.curvature.reduce((s,c)=>s+c.curvature,0)/r.curvature.length:''].join(','))].join('\n');}
  return{resample,bends,circle,curvature,spectrum,analyze,csv};
});
