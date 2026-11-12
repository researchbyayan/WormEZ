const test=require('node:test'),assert=require('node:assert/strict');require('../lib/anatomy.js');const T=require('../lib/tracking.js'),P=require('../lib/parallel.js');const GiB=1024**3;
const anchors=Array.from({length:9},(_,i)=>({frame:i*1000,x:i,y:0,origin:'manual',status:'manual'}));
test('resource policy allows four to eight sections without treating browser RAM as free RAM',()=>{
 const base={width:1280,height:720,start:0,end:8000,fps:30,anchors};const a=P.plan({...base,resources:{logicalCpus:8,totalMemoryBytes:8*GiB,availableMemoryBytes:1.5*GiB}});assert.equal(a.chunks.length,4);assert.equal(a.threads,3);assert.equal(a.passes,3);
 assert.equal(P.plan({...base,resources:{logicalCpus:4,totalMemoryBytes:8*GiB,availableMemoryBytes:1.5*GiB}}).enabled,true);
 const b=P.plan({...base,resources:{logicalCpus:16,totalMemoryBytes:32*GiB,availableMemoryBytes:8*GiB}});assert.equal(b.chunks.length,8);assert.equal(b.threads,8);assert.equal(b.passes,16);
 assert.equal(P.plan({...base,resources:{logicalCpus:16,totalMemoryBytes:32*GiB,availableMemoryBytes:.2*GiB}}).enabled,false);
 assert.equal(P.plan({...base,resources:{logicalCpus:16,totalMemoryBytes:32*GiB,availableMemoryBytes:null}}).enabled,true);
 assert.equal(P.plan({...base,anchors:anchors.slice(0,-1),resources:{logicalCpus:8,totalMemoryBytes:16*GiB,availableMemoryBytes:4*GiB}}).enabled,false);
});
test('section merge owns every frame once and rejects overlap/camera conflicts without bridging unavailable frames',()=>{
 const row=f=>({frame:f,x:f/10,y:0,valid:true}),rows=(a,b)=>Array.from({length:b-a+1},(_,i)=>row(a+i));
 const manual=[0,50,100].map(f=>({...row(f),origin:'manual',status:'manual'})),parts=[{chunk:{ownedStart:0,ownedEnd:50,a:manual[0],b:manual[1]},forward:rows(0,85),backward:rows(0,50)},{chunk:{ownedStart:51,ownedEnd:100,a:manual[1],b:manual[2]},forward:rows(50,100),backward:rows(15,100)}];
 parts[1].backward.find(p=>p.frame===49).x=100;parts[0].forward.find(p=>p.frame===55).valid=false;parts[0].forward.find(p=>p.frame===55).reason='Camera movement: center motion cannot be isolated';
 const result=P.merge(parts,manual,20,0,100,f=>f>=60&&f<=62);assert.equal(result.points.length,101);assert.equal(new Set(result.points.map(p=>p.frame)).size,101);assert.equal(result.points[50].status,'manual');assert.equal(result.points[49].status,'uncertain');assert.match(result.points[55].reason,/Camera movement/);assert.equal(T.linked(result.points[59],result.points[60]),false);assert.equal(T.linked(result.points[62],result.points[63]),false);
});
test('queue bounds simultaneous work and cancellation wakes queued tasks',async()=>{
 const job=new T.Job();job.activePassLimit=3;let active=0,peak=0,done=0;await P.runQueue(Array.from({length:12},()=>async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,3));active--;done++;}),job,3);assert.equal(done,12);assert.equal(peak,3);
 const cancelled=new T.Job();cancelled.activePassLimit=1;let began=0;const pending=P.runQueue(Array.from({length:6},()=>async()=>{began++;cancelled.cancel();await cancelled.checkpoint();}),cancelled,3);await assert.rejects(pending,T.Cancelled);assert.equal(began,1);
});
