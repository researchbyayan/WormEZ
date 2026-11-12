/* Resource-bounded, anchor-seeded sections. Model outputs never create cuts. */
(function(root){
  const MiB=1024*1024,GiB=1024*MiB;
  function capacity(resources={},width=1280,height=720){
    const cpus=Math.max(1,resources.logicalCpus||2),total=resources.totalMemoryBytes||0,known=Number.isFinite(resources.availableMemoryBytes),available=known?resources.availableMemoryBytes:0;
    const threadBytes=192*MiB,passBytes=112*MiB+width*height*12;
    let threads=Math.min(8,Math.max(1,cpus-1)),passes=Math.min(16,Math.max(2,cpus));
    if(total&&total<=8*GiB)passes=Math.min(passes,4);
    else if(total&&total<=16*GiB)passes=Math.min(passes,8);
    if(!known){threads=Math.min(threads,2);passes=Math.min(passes,2);}
    else{
      const budget=Math.min(3.5*GiB,Math.max(0,available-512*MiB));
      while(passes>1&&threads*threadBytes+passes*passBytes>budget){passes--;threads=Math.min(threads,passes);}
      while(threads>1&&threads*threadBytes+passes*passBytes>budget)threads--;
    }
    threads=Math.min(threads,passes);
    return {threads,passes,sessionsPerWorker:Math.max(1,Math.ceil(passes/threads)),availableMemoryBytes:known?available:null,totalMemoryBytes:total,estimatedBytes:threads*threadBytes+passes*passBytes,memorySource:resources.memorySource||'browser-conservative'};
  }
  function plan({resources,width,height,start,end,fps,anchors,minChunkFrames,allowSharedThreads=false}){
    const policy=capacity(resources,width,height),minFrames=minChunkFrames||Math.max(30,Math.round(fps*2));
    const sorted=[...new Map(anchors.filter(p=>p.frame>=start&&p.frame<=end).map(p=>[p.frame,p])).values()].sort((a,b)=>a.frame-b.frame);
    const target=(end-start+1)/fps>=90&&policy.passes>=8?8:4;
    const base={...policy,targetChunks:target,chunks:[],halo:Math.max(5,Math.ceil(fps)+5),enabled:false};
    if(sorted[0]?.frame!==start||sorted.at(-1)?.frame!==end)return {...base,reason:'Approved section boundaries are required'};
    if(policy.passes<2)return {...base,reason:'Insufficient memory for independent sections'};
    if(policy.threads<2&&!allowSharedThreads)return {...base,reason:'Only one CV worker fits the current budget'};
    let count=Math.min(target,sorted.length-1,Math.floor((end-start)/minFrames));
    for(;count>=2;count--){
      const cuts=[sorted[0]];
      for(let i=1;i<count;i++){
        const goal=start+(end-start)*i/count,options=sorted.filter(p=>p.frame>=cuts.at(-1).frame+minFrames&&p.frame<=end-(count-i)*minFrames);
        if(!options.length)break;
        cuts.push(options.reduce((a,b)=>Math.abs(b.frame-goal)<Math.abs(a.frame-goal)?b:a));
      }
      if(cuts.length!==count)continue;
      cuts.push(sorted.at(-1));
      return {...base,enabled:true,reason:'Approved anchors support independent sections',chunks:cuts.slice(1).map((b,i)=>({index:i,a:cuts[i],b,ownedStart:cuts[i].frame+(i?1:0),ownedEnd:b.frame}))};
    }
    return {...base,reason:'Recording or approved intervals are too short to split efficiently'};
  }
  async function runQueue(tasks,job,limit,onDone){
    let cursor=0,active=0,firstError;const wake=new Set();
    const notify=()=>{for(const fn of [...wake])fn();};
    const wait=()=>new Promise(resolve=>{const done=()=>{wake.delete(done);job.waiters?.delete(done);resolve();};wake.add(done);job.waiters?.add(done);});
    const runner=async()=>{
      while(true){
        await job.checkpoint();
        while(active>=Math.max(1,job.activePassLimit||limit)){await wait();await job.checkpoint();}
        if(cursor>=tasks.length)return;
        const task=tasks[cursor++];active++;job.queuePeakActive=Math.max(job.queuePeakActive||0,active);
        try{await task();if(onDone)await onDone();}
        catch(e){firstError??=e;job.cancel();throw e;}
        finally{active--;notify();}
      }
    };
    await Promise.allSettled(Array.from({length:Math.min(limit,tasks.length)},runner));
    if(firstError)throw firstError;
    await job.checkpoint();
  }
  function merge(parts,manual,length,start,end,unavailable){
    const T=root.WormTracker,A=root.WormAnatomy,points=new Map(),fixed=new Set(manual.map(p=>p.frame));
    for(const part of parts){
      for(const p of T.reconcile(part.forward,part.backward,manual,length))if(p.frame>=part.chunk.ownedStart&&p.frame<=part.chunk.ownedEnd)points.set(p.frame,p);
    }
    const reject=(frame,reason)=>{const p=points.get(frame);if(p&&!fixed.has(frame))points.set(frame,{...p,status:'uncertain',reason});};
    // A camera-motion rejection in a halo is authoritative across ownership cuts.
    for(const part of parts)for(const p of [...part.forward,...part.backward])if(p.reason?.startsWith('Camera movement'))reject(p.frame,p.reason);
    let seamDisputes=0;
    for(let i=1;i<parts.length;i++){
      const cut=parts[i].chunk.a.frame,extras=[parts[i-1].forward,parts[i].backward];
      for(const rows of extras)for(const q of rows){
        if(Math.abs(q.frame-cut)>5||!q.valid)continue;
        const p=points.get(q.frame);if(!T.accepted(p)||fixed.has(q.frame))continue;
        if(T.distance(p,q)>length/4||(p.anatomy&&q.anatomy&&!A.agree(p.anatomy,q.anatomy,length))){reject(q.frame,'Section overlap disagrees; bounded verification required');seamDisputes++;}
      }
    }
    const out=[];
    for(let f=start;f<=end;f++){
      if(unavailable(f))out.push({frame:f,x:0,y:0,status:'uncertain',origin:'auto',reason:'Marked unavailable by user'});
      else{const p=points.get(f);if(!p)throw new Error('A section did not return frame '+f);out.push(p);}
    }
    return {points:out,seamDisputes};
  }

  // A fast result is explicitly tracked, never presented as independent two-pass evidence.
  function singlePass(rows,manual,length){
    const fixed=new Map(manual.map(p=>[p.frame,p]));
    return rows.map((p,i)=>{
      if(fixed.has(p.frame))return {...p,...fixed.get(p.frame),status:'manual',origin:'manual',evidence:'approved-anchor'};
      const prev=rows[i-1],two=rows[i-2];
      const physical=root.WormTracker.proximity(p,prev?.valid&&p.frame-prev.frame===1?prev:null,two?.valid&&p.frame-two.frame===2?two:null,length);
      return {...p,status:p.valid&&physical.ok?'tracked':'uncertain',origin:'auto',evidence:'single-pass',reason:p.valid?physical.reason:p.reason||'No reliable detection'};
    });
  }
  function verificationWindows(rows,a,b,length,halo=5){
    const ranges=[{start:Math.max(a.frame,b.frame-halo),end:b.frame}];
    // If the independently approved endpoint is missed, reverse the whole interval.
    const end=rows.find(p=>p.frame===b.frame);
    if(!end?.valid||end.anchorMismatch||root.WormTracker.distance(end,b)>length/4)return [{start:a.frame,end:b.frame}];
    for(let i=0;i<rows.length;i++){
      const p=rows[i];if(p.frame<a.frame||p.frame>b.frame)continue;
      const prior=rows[i-1];
      if(!p.valid||(prior?.valid&&p.frame-prior.frame===1&&root.WormTracker.distance(p,prior)>length*.5))ranges.push({start:Math.max(a.frame,p.frame-halo),end:Math.min(b.frame,p.frame+halo)});
    }
    ranges.sort((x,y)=>x.start-y.start);const merged=[];
    for(const r of ranges){const last=merged.at(-1);if(last&&r.start<=last.end+1)last.end=Math.max(last.end,r.end);else merged.push({...r});}
    return merged;
  }
  function mergeFast(parts,manual,length,start,end,unavailable){
    const points=new Map(),fixed=new Set(manual.map(p=>p.frame));let seamDisputes=0;
    for(const part of parts)for(const p of part.points)if(p.frame>=part.chunk.ownedStart&&p.frame<=part.chunk.ownedEnd)points.set(p.frame,p);
    for(let i=1;i<parts.length;i++){
      const cut=parts[i].chunk.a.frame;
      for(const q of parts[i-1].forward){
        if(q.frame<cut||q.frame>cut+5||!q.valid||fixed.has(q.frame))continue;
        const p=points.get(q.frame);if(root.WormTracker.accepted(p)&&root.WormTracker.distance(p,q)>length/4){points.set(q.frame,{...p,status:'uncertain',reason:'Section overlap disagrees',evidence:'seam-dispute'});seamDisputes++;}
      }
    }
    const out=[];for(let f=start;f<=end;f++)out.push(unavailable(f)?{frame:f,x:0,y:0,status:'uncertain',reason:'Marked unavailable by user'}:points.get(f)||{frame:f,x:0,y:0,status:'uncertain',reason:'No section sample'});
    return {points:out,seamDisputes};
  }
  root.WormParallel={capacity,plan,runQueue,merge,singlePass,verificationWindows,mergeFast};
  if(typeof module!=='undefined')module.exports=root.WormParallel;
})(typeof window==='undefined'?globalThis:window);
