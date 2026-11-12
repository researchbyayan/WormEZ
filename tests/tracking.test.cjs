const {test}=require('node:test');const assert=require('node:assert/strict');const T=require('../lib/tracking.js');
const pathwaySource=require('node:fs').readFileSync(require('node:path').join(__dirname,'../WormEZ.html'),'utf8');
const displayCurve=new Function(pathwaySource.slice(pathwaySource.indexOf('function displayCurve('),pathwaySource.indexOf('function manualTraceSegments()'))+';return displayCurve;')();
const makeManualSegments=new Function('S','T','unavailable=()=>false',pathwaySource.slice(pathwaySource.indexOf('function manualTraceSegments()'),pathwaySource.indexOf('function estimatedBridges('))+';return manualTraceSegments;');
const pt=(frame,x,status='verified')=>({frame,x,y:0,status});
const Tapir=require('../lib/tapir-recovery.js');
test('TAPIR guidance stays bounded and requires agreeing visible body points and endpoint',()=>{
 const a={frame:10,x:100,y:100,anatomy:{line:Array.from({length:21},(_,i)=>({x:90+i,y:100})),outline:[]}},b={frame:12,x:104,y:100};
 const roi=Tapir.cropFor(a,b,20,320,240),seeds=Tapir.seedsFor(a,roi);
 assert.equal(seeds.length,3);
 const step=2*256/roi.size;
 const positions=seeds.map(s=>[s.query,[s.query[0]+step,s.query[1]],[s.query[0]+step*2,s.query[1]]]);
 const visible=seeds.map(()=>[true,true,true]);
 const hints=Tapir.hintsFromTrack({positions,visible},seeds,roi,a,20,10,b);
 assert.equal(hints.size,3);assert.equal(hints.get(12).x,104);
 visible[1][1]=visible[2][1]=false;
 assert.equal(Tapir.hintsFromTrack({positions,visible},seeds,roi,a,20,10,b).has(11),false);
 assert.equal(Tapir.hintsFromTrack({positions,visible},seeds,roi,a,20,10,{frame:12,x:200,y:100}),null);
 const jumped=seeds.map(s=>[s.query,[s.query[0]+12*256/roi.size,s.query[1]],[s.query[0]+step*2,s.query[1]]]);
 assert.equal(Tapir.hintsFromTrack({positions:jumped,visible:seeds.map(()=>[true,true,true])},seeds,roi,a,20,10,b),null);
});
test('pause preserves work until resumed; cancel wakes paused jobs',async()=>{const job=new T.Job();job.pause();let passed=false;const p=job.checkpoint().then(()=>passed=true);await new Promise(r=>setTimeout(r,20));assert.equal(passed,false);job.resume();await p;assert.equal(passed,true);job.pause();const cancelled=job.checkpoint();job.cancel();await assert.rejects(cancelled,T.Cancelled);});
test('opposite passes must agree; invalid hypotheses never become anchors',()=>{const f=[{...pt(0,0),valid:true},{...pt(1,1),valid:false},{...pt(2,2),valid:true}];const b=[{...pt(0,0),valid:true},{...pt(1,1),valid:true},{...pt(2,10),valid:true}];const r=T.reconcile(f,b,[],4);assert.deepEqual(r.map(p=>p.status),['verified','uncertain','uncertain']);assert.deepEqual(T.intervals(r),[{start:1,end:2}]);assert.deepEqual(T.anchors(r,30).map(p=>p.frame),[0]);});
test('manual corrections override disagreeing automatic passes',()=>{const r=T.reconcile([{...pt(0,0),valid:false}],[],[pt(0,10,'manual')],4);assert.equal(r[0].x,10);assert.equal(r[0].status,'manual');});
test('smoothing and movement links do not bridge occlusions',()=>{const points=[pt(0,0),pt(1,0),pt(2,100,'uncertain'),pt(3,200),pt(4,200)];assert.deepEqual(T.smooth(points,5).map(p=>p.x),[0,0,100,200,200]);assert.equal(T.linked(points[1],points[2]),false);assert.equal(T.linked(pt(0,0),pt(3,1)),false);});
test('stationary endpoints and significant turns produce anchors',()=>{const p=[pt(0,0),pt(1,1),{...pt(2,1),y:1}, {...pt(3,1),y:1}];assert.deepEqual(T.anchors(p,30).map(p=>p.frame),[0,1,3]);});
test('ambiguous and off-gate candidates require review',()=>{assert.equal(T.choose([{x:0,y:0,area:10},{x:1,y:0,area:20}],null,10),null);assert.equal(T.choose([{x:100,y:0}],{x:0,y:0},5),null);});
test('proximity enforces one-frame and two-frame body-length limits',()=>{
 assert.equal(T.proximity({x:5,y:0},{x:0,y:0},null,10,.5).ok,true);
 assert.equal(T.proximity({x:5.1,y:0},{x:0,y:0},null,10,.5).reason,'Movement exceeds physical limit (one frame)');
 assert.equal(T.proximity({x:10.1,y:0},{x:5.1,y:0},{x:0,y:0},10,.6).reason,'Movement exceeds physical limit (two frames)');
 assert.equal(T.proximity({x:9.9,y:0},{x:5,y:0},{x:0,y:0},10,.5).ok,true);
});
test('five-frame context rejects impossible motion without bridging gaps or overriding manual points',()=>{
 const moving=Array.from({length:7},(_,frame)=>({frame,x:frame*4.2,y:0,status:'verified',origin:'auto'}));
 const checked=T.fiveFrameConsistency(moving,10);
 assert.equal(checked[0].reason,'Movement exceeds two body lengths over five frames');
 assert.equal(checked[6].status,'uncertain');
 const corrected=moving.map(p=>({...p}));corrected[0]={...corrected[0],status:'manual',origin:'manual'};
 assert.equal(T.fiveFrameConsistency(corrected,10)[0].status,'manual');
 corrected[3].status='uncertain';assert.equal(T.fiveFrameConsistency(corrected,10)[1].status,'verified');
});
test('display curve passes through observations and cannot overshoot either coordinate',()=>{
 const straight=displayCurve([{frame:0,x:0,y:0},{frame:10,x:10,y:20}]);
 assert.equal(straight[0].x,0);assert.equal(straight.at(-1).y,20);
 assert.ok(straight.some(p=>Math.abs(p.frame-5)<1e-9&&Math.abs(p.x-5)<1e-9&&Math.abs(p.y-10)<1e-9));
 const knots=[{frame:0,x:0,y:0},{frame:1,x:10,y:0},{frame:2,x:10,y:10},{frame:3,x:20,y:10}],curve=displayCurve(knots);
 for(const p of curve){const i=Math.min(2,Math.floor(p.frame));assert.ok(p.x>=Math.min(knots[i].x,knots[i+1].x)-1e-9&&p.x<=Math.max(knots[i].x,knots[i+1].x)+1e-9);assert.ok(p.y>=Math.min(knots[i].y,knots[i+1].y)-1e-9&&p.y<=Math.max(knots[i].y,knots[i+1].y)+1e-9);}
});
test('straight-line fallback requires explicit permission and never crosses verified or unavailable frames',()=>{
 const a={frame:0,x:0,y:0,origin:'manual',status:'manual',reviewSource:'corrected'},b={frame:3,x:3,y:4,origin:'manual',status:'manual',reviewSource:'approved'};
 const state={workflowPhase:'results',fps:30,keyframes:[a,b],track:[a,{frame:1,status:'uncertain'},{frame:2,status:'uncertain'},b],unavailable:[]};
 assert.equal(makeManualSegments(state,T)().length,0);state.manualFallbackEnabled=true;assert.equal(makeManualSegments(state,T)()[0].distance,5);
 state.track[1]={frame:1,status:'uncertain',modelHint:{x:1,y:1}};state.track[2]={frame:2,status:'uncertain',modelHint:{x:2,y:2}};assert.equal(makeManualSegments(state,T)().length,1);state.unavailable=[{start:1,end:2}];assert.equal(makeManualSegments(state,T)().length,0);state.unavailable=[];
 state.track[1]={frame:1,x:1,y:1,status:'verified'};const remaining=makeManualSegments(state,T)();assert.equal(remaining.length,1);assert.equal(remaining[0].start,1);assert.equal(remaining[0].end,3);
});
test('total detection failure retains time samples and labels interior positions unverified',()=>{
 const a={frame:0,x:2,y:4,origin:'manual',reviewSource:'corrected'},b={frame:4,x:10,y:8,origin:'manual',reviewSource:'manual'};
 const state={manualFallbackEnabled:false,totalFrames:5,keyframes:[a,b],track:[]};let phase='',saved=false;
 const makeFallback=new Function('S','unavailable','setWorkflow','setStatus','saveResult',pathwaySource.slice(pathwaySource.indexOf('function recordDetectionFailure()'),pathwaySource.indexOf('function estimatedBridges('))+';return recordDetectionFailure;');
 const fallback=makeFallback(state,()=>false,p=>{phase=p},()=>{},()=>{saved=true});
 fallback();assert.equal(phase,'results');assert.equal(saved,true);
 assert.equal(state.track.length,5);assert.equal(state.track[0].status,'manual');assert.equal(state.track[4].status,'manual');
 assert.equal(state.track[2].x,0);assert.equal(state.track[2].status,'uncertain');assert.match(state.track[2].reason,/unavailable/);assert.equal(state.manualFallbackEnabled,false);
});
test('dark-body segmentation can outvote failed flow only for a close matching body',()=>{
 const reference={x:0,y:0,polarity:'dark',contrast:40,length:100,area:2000};
 const body={x:5,y:0,polarity:'dark',contrast:45,length:105,area:2200};
 assert.equal(T.segmentFallback(body,reference,reference,100),true);
 assert.equal(T.segmentFallback({...body,x:20},reference,reference,100),false);
 assert.equal(T.segmentFallback({...body,contrast:20},reference,reference,100),false);
 assert.equal(T.segmentFallback({...body,polarity:'bright'},reference,reference,100),false);
});
const A=require('../lib/anatomy.js');
const Scale=require('../lib/scale.js');
test('reference calibration converts mm, cm, micrometers and inches consistently',()=>{
 const points=[{x:0,y:0},{x:200,y:0}];assert.equal(Scale.calibrate(100,'mm',points),.5);assert.equal(Scale.calibrate(10,'cm',points),.5);assert.equal(Scale.calibrate(100000,'um',points),.5);assert.equal(Scale.calibrate(1,'in',points),.127);
 assert.equal(Scale.calibrate(0,'mm',points),null);assert.equal(Scale.calibrate(10,'mm',[points[0],{x:1,y:0}]),null);
 const fields=Scale.fields({x:20,y:10},4,40,'',.5,'cm');assert.equal(fields.cumulative_physical,2);assert.equal(fields.speed_physical_per_s,'');assert.equal(fields.physical_unit,'cm');
});
const ellipse=(dx=0)=>Array.from({length:100},(_,i)=>({x:60+dx+22*Math.cos(i*Math.PI/50),y:100+7*Math.sin(i*Math.PI/50)}));
test('outline supplies a medial center and endpoints, including a curved body',()=>{
 const g=A.geometry(ellipse());assert.ok(g);assert.ok(Math.abs(g.center.x-60)<2);assert.ok(g.length>40&&g.length<46);
 const arc=[];for(let i=0;i<=80;i++){const t=-1.1+2.2*i/80;arc.push({x:60+38*Math.cos(t),y:60+38*Math.sin(t)});}for(let i=80;i>=0;i--){const t=-1.1+2.2*i/80;arc.push({x:60+25*Math.cos(t),y:60+25*Math.sin(t)});}
 const curved=A.geometry(arc);assert.ok(curved);assert.ok(A.inside(curved.center,arc));assert.ok(curved.length>50);assert.equal(A.geometry([]),null);
});
test('head identity survives endpoint ordering changes, never crosses a gap',()=>{
 const points=Array.from({length:5},(_,frame)=>({...pt(frame,frame),anatomy:A.geometry(ellipse(frame))}));
 points[1].anatomy.ends.reverse();points[1].anatomy.line.reverse();points[3].status='uncertain';
 A.orient(points,[{frame:0,...points[0].anatomy.ends[0]}]);
 assert.ok(points[1].anatomy.head.x<points[1].anatomy.center.x);assert.ok(points[2].anatomy.head);assert.equal(points[3].anatomy.head,undefined);assert.equal(points[4].anatomy.head,undefined);
 assert.equal(A.fields(points[4],points[3],30).head_speed_px_s,'');
});
test('five-frame H/C/T estimates stay review-only and avoid unavailable frames',()=>{
 const anatomy=x=>({center:{x,y:0},head:{x:x+8,y:0},tail:{x:x-8,y:0},ends:[{x:x-8,y:0},{x:x+8,y:0}],length:16});
 const points=Array.from({length:11},(_,frame)=>({frame,x:frame,y:0,status:'verified',anatomy:frame===5?null:anatomy(frame)}));
 const estimate=A.temporalLandmarks(points,5,5);
 assert.deepEqual(estimate.from,[4,6]);assert.deepEqual(estimate.center,{x:5,y:0});
 assert.deepEqual(estimate.head,{x:13,y:0});assert.deepEqual(estimate.tail,{x:-3,y:0});
 assert.equal(points[5].anatomy,null);assert.equal(A.fields(points[5],points[4],30).head_status,'unavailable');
 points[5].status='uncertain';assert.equal(A.temporalLandmarks(points,5,5).centerEstimated,true);
 assert.equal(A.temporalLandmarks(points,5,5,[{start:5,end:5}]),null);
 points[4].anatomy=null;points[6].anatomy=null;points[3].anatomy=null;points[7].anatomy=null;
 assert.deepEqual(A.temporalLandmarks(points,5,5).from,[2,8]);
 assert.equal(A.temporalLandmarks(points,5,2),null);
});
test('independent shape disagreement preserves agreed center but withholds anatomy',()=>{
 const a=A.geometry(ellipse()),b=A.geometry(ellipse(30));const f={...pt(0,0),valid:true,anatomy:a};
 assert.equal(T.reconcile([f],[{...f,anatomy:b}],[],44)[0].anatomy,null);
 assert.ok(T.reconcile([f],[f],[],44)[0].anatomy);
 const disputed=T.reconcile([f],[{...f,anatomy:b}],[],44);
 assert.equal(disputed[0].status,'verified');
 assert.equal(disputed[0].anatomy,null);
 assert.deepEqual(T.intervals(disputed),[]);
 const centerOnly=A.fields(disputed[0],null,30);
 assert.equal(centerOnly.center_x_px,disputed[0].x);
 assert.equal(centerOnly.head_status,'unavailable');
 assert.equal(A.fields({...disputed[0],frame:1,x:3},disputed[0],30).center_speed_px_s,90);
 const shifted=structuredClone(a);shifted.center.x+=2;
 const agreed=T.reconcile([f],[{...f,anatomy:shifted}],[],44)[0];
 assert.equal(agreed.status,'verified');
 assert.equal(agreed.x,a.center.x+1);
});
test('stationary pixel jitter does not create turn anchors at every frame',()=>{
 const points=Array.from({length:60},(_,i)=>pt(i,i%2));assert.deepEqual(T.anchors(points,30,30,44).map(p=>p.frame),[0,30,59]);
 assert.equal(T.turnAt(points,30,11),null);
});
test('head translation is separated from motion relative to the body',()=>{
 const a={...pt(0,0),anatomy:A.geometry(ellipse())},b={...pt(1,3),anatomy:A.geometry(ellipse(3))};A.orient([a,b],[{frame:0,...a.anatomy.ends[0]}]);
 const r=A.fields(b,a,30);assert.ok(r.head_speed_px_s>80);assert.ok(r.head_relative_speed_px_s<.001);
 const points=[pt(0,0),pt(1,10),{...pt(2,10),y:10}];assert.equal(T.turnAt(points,1,5),90);points[0].status='uncertain';assert.equal(T.turnAt(points,1,5),null);
});

test('motion infers head once and preserves identity through reversal; stationary identity stays unknown',()=>{
 const make=(frame,x)=>({frame,x,y:0,status:'verified',anatomy:{center:{x,y:0},length:20,ends:[{x:x-10,y:0},{x:x+10,y:0}],line:Array.from({length:21},(_,i)=>({x:x-10+i,y:0}))}});
 const moving=Array.from({length:30},(_,i)=>make(i,i<15?i:30-i));
 const seeds=A.infer(moving,10);assert.equal(seeds.length,1);A.orient(moving,seeds);
 assert.ok(moving[25].anatomy.head.x>moving[25].anatomy.center.x);assert.equal(moving[25].anatomy.headStatus,'motion inferred');
 assert.equal(A.infer(Array.from({length:30},(_,i)=>make(i,0)),10).length,0);
});
test('head identity resumes after a missing outline when verified centers remain continuous',()=>{
 const points=Array.from({length:12},(_,frame)=>({frame,x:60+frame*3,y:100,status:'verified',anatomy:frame===5?null:A.geometry(ellipse(frame*3))}));
 const seeds=A.infer(points,10);assert.equal(seeds.length,1);
 A.orient(points,seeds,10);
 assert.ok(points[4].anatomy.head);
 assert.equal(points[5].anatomy,null);
 assert.ok(points[6].anatomy.head);
 points[5].status='uncertain';A.orient(points,seeds,10);
 assert.equal(points[6].anatomy.head,undefined);
});
test('tail corrections label the opposite endpoint as head and export tail fields',()=>{
 const g=A.geometry(Array.from({length:64},(_,i)=>({x:60+25*Math.cos(i*Math.PI/32),y:50+8*Math.sin(i*Math.PI/32)})));
 const p={frame:0,status:'verified',anatomy:g};A.orient([p],[{...g.ends[0],frame:0,kind:'tail'}]);assert.deepEqual(g.tail,g.ends[0]);assert.deepEqual(g.head,g.ends[1]);
 const fields=A.fields(p,null,30);assert.equal(fields.tail_status,'manual');assert.ok(!('leg_status' in fields));
});
test('resume and cancel release all concurrent pass checkpoints',async()=>{const job=new T.Job();job.pause();const waits=[job.checkpoint(),job.checkpoint()];job.resume();await Promise.all(waits);job.pause();const cancelled=[job.checkpoint(),job.checkpoint()];job.cancel();for(const p of cancelled)await assert.rejects(p,T.Cancelled);});
test('real staircase skeletons preserve connected body paths without relaxing branch rejection',()=>{
 for(const fixture of require('./centerline-regression.json')){
  const g=A.geometry(fixture.outline);assert.ok(g,`straight frame ${fixture.frame}`);
  assert.equal(g.line.length,21);assert.ok(A.inside(g.center,fixture.outline));
 }
});

test('sampled TAPIR guidance preserves endpoints and leaves invisible stretches without hints',()=>{
  const frames=Tapir.sampleFrames(10,129);
  assert.equal(frames.length,24);
  assert.equal(frames[0],10);
  assert.equal(frames.at(-1),129);
  const anchor={frame:10,x:50,y:50},end={frame:129,x:169,y:50};
  const seeds=[{query:[20,20]},{query:[22,20]}];
  const positions=seeds.map(({query:[x,y]})=>frames.map(frame=>[x+frame-10,y]));
  const visible=seeds.map(()=>frames.map((_,i)=>i!==2));
  const hints=Tapir.hintsFromTrack({positions,visible},seeds,{size:256},anchor,20,10,end,frames);
  assert.equal(hints.get(11).x,51);
  assert.equal(hints.has(frames[2]),false);
  assert.equal(hints.has(frames[2]+1),false);
  assert.deepEqual(hints.get(129),{x:169,y:50});
});
