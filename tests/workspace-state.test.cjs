const test=require('node:test'),assert=require('node:assert/strict');
const {project,create,Epoch,commands}=require('../lib/workspace-state.js');
const ready={loaded:true,boundaryReady:true,clipId:4,jobId:8,frame:12,phase:'ready',stage:'setup'};
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};
test('capabilities explain unavailable actions without changing engine state',()=>{
  assert.equal(project({}).capabilities['analysis.start'].code,'no-video');
  assert.equal(project({...ready,boundaryReady:false}).capabilities['analysis.start'].code,'missing-boundaries');
  assert.equal(project({...ready,areaEditor:true}).capabilities['analysis.start'].code,'pending-dialog');
  assert.equal(project({...ready,seeking:true}).capabilities['analysis.start'].code,'seeking');
  assert.equal(project({...ready,batchBusy:true}).capabilities['session.reset'].enabled,false);
  assert.equal(project(ready).capabilities['analysis.start'].enabled,true);
  assert.deepEqual(Object.keys(project(ready).capabilities),[...commands,'results.export']);
  assert.equal(project({...ready,trackCount:60,fitStale:true}).capabilities['results.export'].code,'stale-fit');
  assert.equal(project({...ready,trackCount:60}).capabilities['results.export'].enabled,true);
});
test('independent regions preserve review, transport and result freshness',()=>{
  const state=project({...ready,jobOwned:true,running:true,paused:true,reviewOpen:true,reviewHere:true,pendingAnchor:{frame:12},fitComplete:true,fitStale:true,analysisPresent:true,batchPhase:'running'});
  assert.equal(state.regions.job,'paused');assert.equal(state.regions.review,'reviewing');assert.equal(state.regions.pointer,'pending');assert.equal(state.regions.results,'stale');assert.equal(state.regions.batch,'running');assert.equal(state.capabilities['analysis.resume'].enabled,true);assert.equal(state.capabilities['review.accept'].enabled,false);assert.equal(state.capabilities['anchor.confirm'].enabled,true);
  assert.ok(state.violations.includes('analysis-revision-stale'));assert.equal(project({...ready,pendingAnchor:{frame:11}}).capabilities['anchor.confirm'].enabled,false);
});
test('commands reject stale clip, job and frame ownership and run only supported actions',async()=>{
  let starts=0;const machine=create(()=>ready,{'analysis.start':()=>starts++});
  for(const expected of [{clipId:3},{jobId:7},{frame:11}])assert.equal((await machine.send({type:'analysis.start',expected})).code,'stale-context');
  assert.equal((await machine.send({type:'unknown'})).code,'unknown-command');
  const result=await machine.send({type:'analysis.start',expected:{clipId:4,jobId:8,frame:12}});assert.equal(result.ok,true);assert.equal(starts,1);assert.deepEqual(result.snapshot.pendingCommands,[]);
});
test('repeated start cannot overlap, but Stop remains callable during analysis',async()=>{
  let state={...ready},starts=0;const pending=deferred();
  const machine=create(()=>state,{'analysis.start':async()=>{starts++;state={...state,running:true,jobOwned:true,jobId:9};await pending.promise;},'analysis.stop':()=>{state={...state,running:false,jobOwned:false};pending.resolve();}});
  const start=machine.send({type:'analysis.start'});assert.equal((await machine.send({type:'analysis.start'})).code,'command-in-flight');assert.equal((await machine.send({type:'analysis.stop'})).ok,true);await start;assert.equal(starts,1);assert.equal(machine.getSnapshot().regions.job,'idle');
});
test('subscriptions are change-only, snapshots are immutable and diagnostic history is bounded',async()=>{
  let state={...ready},events=0;const machine=create(()=>state,{'review.next':()=>{state={...state,frame:state.frame+1};}});const unsubscribe=machine.subscribe(()=>events++);const snapshot=machine.getSnapshot();assert.equal(machine.getSnapshot(),snapshot);assert.equal(events,1);assert.ok(Object.isFrozen(snapshot.context)&&Object.isFrozen(snapshot.capabilities['analysis.start']));
  state={...state,frame:13};assert.ok(machine.getSnapshot().revision>snapshot.revision);assert.equal(events,2);unsubscribe();state={...state,frame:14};machine.refresh();assert.equal(events,2);
  for(let i=0;i<80;i++)await machine.send({type:'unknown'});assert.equal(machine.getHistory().length,64);const copy=machine.getHistory();copy.length=0;assert.equal(machine.getHistory().length,64);
});
test('source intent epochs invalidate late work on replacement and reset',()=>{const scope=new Epoch(),a=scope.begin(),b=scope.begin();assert.equal(scope.current(a),false);assert.equal(scope.current(b),true);scope.cancel();assert.equal(scope.current(b),false);});
