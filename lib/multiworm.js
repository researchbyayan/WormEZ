/* Local, model-free identity linking. Pixel data stays in the video decoder. */
(function(root){
  'use strict';
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  function compact(candidate,frame){
    const outline=candidate.outline||[];
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of outline){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
    const bounds=outline.length?{x:minX,y:minY,w:maxX-minX,h:maxY-minY}:
      {x:candidate.x-candidate.length/2,y:candidate.y-candidate.width/2,w:candidate.length,h:candidate.width};
    return {frame,x:candidate.x,y:candidate.y,length:candidate.length,width:candidate.width,area:candidate.area,
      colour:candidate.colour||[0,0,0],contrast:candidate.contrast||0,polarity:candidate.polarity||'bright',threshold:candidate.threshold,bounds};
  }
  function appearance(a,b){
    if(a.polarity!==b.polarity)return Infinity;
    const length=Math.abs(Math.log(b.length/a.length)),area=Math.abs(Math.log(b.area/a.area));
    const rgb=Math.hypot(...a.colour.map((v,i)=>v-b.colour[i]))/125;
    return length+area*.6+rgb*.25;
  }
  function predicted(track,frame,window=5){
    const samples=track.samples,n=samples.length,a=samples[n-1],b=samples[Math.max(0,n-window)];
    if(!a)return null;
    const dt=Math.max(1,a.frame-b.frame),ahead=frame-a.frame;
    return {x:a.x+clamp((a.x-b.x)/dt*ahead,-a.length*ahead*.5,a.length*ahead*.5),
      y:a.y+clamp((a.y-b.y)/dt*ahead,-a.length*ahead*.5,a.length*ahead*.5)};
  }
  function linkCost(track,candidate,frame,maxGap){
    const previous=track.samples.at(-1),gap=frame-previous.frame;
    if(gap<1||gap>maxGap||!candidate.length||!candidate.area)return Infinity;
    const bodyLength=(previous.length+candidate.length)/2;
    if(distance(previous,candidate)>Math.max(4,bodyLength*.5*gap))return Infinity;
    const shape=appearance(previous,candidate);
    if(shape>1.35)return Infinity;
    return distance(predicted(track,frame),candidate)/Math.max(4,bodyLength)+shape;
  }
  // Minimum-cost one-to-one assignment with an explicit unmatched option.
  function assign(costs,unmatchedCost=1.5){
    const n=costs.length,m=Math.max(0,...costs.map(row=>row.length));
    if(!n)return [];
    // Hungarian potentials on n rows and m+n columns. Each row has its own dummy.
    const cols=m+n,u=Array(n+1).fill(0),v=Array(cols+1).fill(0),p=Array(cols+1).fill(0),way=Array(cols+1).fill(0);
    const cost=(i,j)=>j<=m?(Number.isFinite(costs[i-1]?.[j-1])?costs[i-1][j-1]:1e6):j===m+i?unmatchedCost:1e6;
    for(let i=1;i<=n;i++){
      p[0]=i;let j0=0;const minv=Array(cols+1).fill(Infinity),used=Array(cols+1).fill(false);
      do{
        used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
        for(let j=1;j<=cols;j++)if(!used[j]){
          const cur=cost(i0,j)-u[i0]-v[j];if(cur<minv[j]){minv[j]=cur;way[j]=j0;}
          if(minv[j]<delta){delta=minv[j];j1=j;}
        }
        for(let j=0;j<=cols;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else minv[j]-=delta;
        j0=j1;
      }while(p[j0]);
      do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
    }
    const out=Array(n).fill(-1);for(let j=1;j<=cols;j++)if(p[j]&&j<=m&&costs[p[j]-1]?.[j-1]<unmatchedCost)out[p[j]-1]=j-1;
    return out;
  }
  class TrackBuilder{
    constructor({maxGap=3,minLength=5}={}){this.maxGap=maxGap;this.minLength=minLength;this.tracks=[];this.nextId=1;this.events=[];}
    step(frame,rawCandidates){
      const detections=rawCandidates.map(c=>compact(c,frame));
      const active=this.tracks.filter(t=>frame-t.samples.at(-1).frame<=this.maxGap);
      const costs=active.map(t=>detections.map(d=>linkCost(t,d,frame,this.maxGap)));
      const assignment=assign(costs),used=new Set(),ambiguous=new Set();
      for(let i=0;i<active.length;i++){
        const j=assignment[i];if(j<0)continue;
        const competing=costs.filter((row,k)=>k!==i&&row[j]<1.5);
        const sameRow=costs[i].filter((c,k)=>k!==j&&c<1.5);
        if(competing.length||sameRow.length){
          for(let k=0;k<detections.length;k++)if(costs[i][k]<1.5)ambiguous.add(k);
          this.events.push({frame,type:'ambiguous',trackIds:[active[i].id],candidate:j});continue;
        }
        active[i].samples.push(detections[j]);used.add(j);
      }
      for(let j=0;j<detections.length;j++)if(!used.has(j)&&!ambiguous.has(j))this.tracks.push({id:this.nextId++,samples:[detections[j]],included:true});
      return this.tracks;
    }
    stable(){return this.tracks.filter(t=>t.samples.length>=this.minLength);}
  }
  function overlap(a,b){
    const x=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
    const y=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    return x*y/Math.max(1,a.w*a.h+b.w*b.h-x*y);
  }
  function edgeSamples(track,side,count=5){return side==='before'?track.samples.slice(-count):track.samples.slice(0,count);}
  function crossingCost(before,after,window=5){
    const a=edgeSamples(before,'before',window),b=edgeSamples(after,'after',window);if(!a.length||!b.length)return Infinity;
    const last=a.at(-1),first=b[0],gap=first.frame-last.frame;if(gap<1||gap>101)return Infinity;
    const bodyLength=(last.length+first.length)/2;
    if(distance(last,first)>Math.max(bodyLength*2,bodyLength*.5*gap))return Infinity;
    const f=predicted({samples:a},first.frame,window);
    const backward=predicted({samples:b.slice().reverse().map(p=>({...p,frame:-p.frame}))},-last.frame,window);
    const back={x:backward.x,y:backward.y};
    const motion=(distance(f,first)+distance(back,last))/(2*Math.max(4,bodyLength));
    return motion+appearance(last,first)+.4*(1-overlap(last.bounds,first.bounds));
  }
  function resolveCrossing(before,after,{margin=.35,window=5}={}){
    if(before.length!==after.length||before.length<2||before.length>4)return {resolved:false,reason:'Unsupported crossing group'};
    const costs=before.map(a=>after.map(b=>crossingCost(a,b,window))),best=assign(costs,1e6);
    if(best.some((j,i)=>j<0||!Number.isFinite(costs[i][j])))return {resolved:false,reason:'No physically plausible identity assignment'};
    const bestCost=best.reduce((sum,j,i)=>sum+costs[i][j],0);
    let second=Infinity;
    for(let i=0;i<best.length;i++){
      const copy=costs.map(row=>row.slice());copy[i][best[i]]=Infinity;
      const alt=assign(copy,1e6);if(alt.some((j,k)=>j<0||!Number.isFinite(copy[k][j])))continue;
      second=Math.min(second,alt.reduce((sum,j,k)=>sum+copy[k][j],0));
    }
    return second-bestCost>=margin?{resolved:true,pairs:before.map((t,i)=>({from:t.id,to:after[best[i]].id})),margin:second-bestCost}:
      {resolved:false,reason:'Competing identities remain equally plausible',margin:second-bestCost};
  }
  function stitchTracklets(tracklets,{maxGap=50,margin=.35}={}){
    const tracks=tracklets.map(t=>({...t,samples:t.samples.slice(),gaps:[]}));
    const unresolved=[];
    let changed=true;
    while(changed){
      changed=false;const proposals=[];
      for(const a of tracks)for(const b of tracks){
        if(a===b)continue;const gap=b.samples[0].frame-a.samples.at(-1).frame;
        if(gap<2||gap>maxGap+1)continue;
        const costs=[5,10,20,50].filter(w=>w<=maxGap).map(w=>crossingCost(a,b,w));
        const finite=costs.filter(Number.isFinite);if(!finite.length)continue;
        proposals.push({a,b,gap,cost:finite.reduce((s,v)=>s+v,0)/finite.length});
      }
      proposals.sort((a,b)=>a.cost-b.cost);
      for(const p of proposals){
        if(!tracks.includes(p.a)||!tracks.includes(p.b)||p.cost>1.7)continue;
        const alternatives=proposals.filter(q=>q!==p&&tracks.includes(q.a)&&tracks.includes(q.b)&&(q.a===p.a||q.b===p.b));
        if(alternatives.some(q=>q.cost-p.cost<margin)){unresolved.push({frame:p.a.samples.at(-1).frame,trackIds:[p.a.id,p.b.id],reason:'Competing identity links'});continue;}
        p.a.gaps.push({start:p.a.samples.at(-1).frame+1,end:p.b.samples[0].frame-1});
        p.a.samples.push(...p.b.samples);p.a.gaps.push(...p.b.gaps);
        tracks.splice(tracks.indexOf(p.b),1);changed=true;break;
      }
    }
    return {tracks,unresolved};
  }
  root.WormMulti={compact,appearance,assign,linkCost,TrackBuilder,crossingCost,resolveCrossing,stitchTracklets};
  if(typeof module!=='undefined')module.exports=root.WormMulti;
})(typeof window==='undefined'?globalThis:window);
