/* Read-only state projection and guarded commands. The engine remains the data owner. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;root.WormWorkspaceState=api;})(globalThis,function(){
  'use strict';
  const commands=['analysis.start','analysis.pause','analysis.resume','analysis.stop','session.reset','anchor.confirm','anchor.cancel','review.accept','review.next','review.back'];
  const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  function project(f={}){
    const busy=!!(f.running||f.preparing),editing=!!(f.pendingAnchor||f.editing||f.scalePicking||f.areaEditor),batchBusy=!!f.batchBusy;
    const cap=(enabled,code,reason)=>({enabled:!!enabled,code:enabled?'available':code,reason:enabled?'':reason});
    const startBlocked=f.phase==='loading'?['loading','Wait for the video to finish opening.']:!f.loaded?['no-video','Load a video first.']:f.camera?['camera-mode','Finish recording before analysis.']:f.startPending?['command-in-flight','The previous analysis command is still finishing.']:busy?['busy','Wait for the current task to finish.']:batchBusy?['batch-busy','Stop the folder operation before starting another analysis.']:f.areaEditor?['pending-dialog','Close the reference area editor first.']:f.seeking?['seeking','Wait for the selected frame to load.']:!f.boundaryReady?['missing-boundaries','Approve the first and last visible anchors.']:null;
    const reviewAllowed=!!(f.reviewOpen&&f.reviewHere&&!busy&&!f.seeking&&!f.pendingAnchor);
    const ownedJob=!!f.jobOwned&&!f.jobCancelled;
    const source=f.camera?(f.recording?'recording':f.finalizing?'finalizing':f.cameraReady?'preview':'opening-camera'):f.phase==='loading'?'loading':f.preparing?'scanning':f.loaded?'ready':'empty';
    const result=f.fitStale?'stale':f.fitComplete?(f.analysisCurrent?'ready':'calculating'):f.trackCount?'partial':'empty';
    const capabilities={
      'analysis.start':cap(!startBlocked,...(startBlocked||['available',''])),
      'analysis.pause':cap(ownedJob&&!f.paused,'not-running','No active analysis can be paused.'),
      'analysis.resume':cap(ownedJob&&f.paused,'not-paused','Analysis is not paused.'),
      'analysis.stop':cap(!!(f.running||f.jobOwned),'not-running','No analysis is running.'),
      'session.reset':cap(!batchBusy&&(f.loaded||busy||f.phase==='loading'||f.phase==='error'||f.camera),'not-resettable',batchBusy?'Stop the folder operation before resetting.':'No session to reset.'),
      'anchor.confirm':cap(!!f.pendingAnchor&&f.pendingAnchor.frame===f.frame&&(!f.running||f.paused)&&!f.preparing&&!f.seeking,'no-pending-point',busy?'Stop analysis before saving the point.':'Place a point on the current frame first.'),
      'anchor.cancel':cap(!!(f.pendingAnchor||f.editing),'no-edit','No point is being edited.'),
      'review.accept':cap(reviewAllowed,'review-unavailable','Open the suggested frame and wait for it to load.'),
      'review.next':cap(!!f.reviewOpen&&!busy&&!f.pendingAnchor,'review-unavailable','Finish the current edit before continuing review.'),
      'review.back':cap(!!f.reviewOpen&&f.reviewIndex>0&&!busy&&!f.pendingAnchor,'review-unavailable','No earlier suggestion is available.'),
      'results.export':cap(!busy&&!f.fitStale&&f.trackCount>1,f.fitStale?'stale-fit':'no-results',f.fitStale?'Re-analyze after changing tracking settings.':'Complete analysis before exporting.')
    };
    const violations=[];
    if(f.pendingAnchor&&f.pendingAnchor.frame!==f.frame)violations.push('pending-anchor-frame-mismatch');
    if(f.jobOwned===false&&f.running&&!f.preparing)violations.push('running-without-current-job');
    if(f.analysisPresent&&!f.analysisCurrent)violations.push('analysis-revision-stale');
    if(f.recording&&!f.camera)violations.push('recording-without-camera');
    return freeze({schemaVersion:1,context:{clipId:f.clipId||0,jobId:f.jobId||0,stage:f.stage||'videos',phase:f.phase||'idle',frame:f.frame||0,message:f.message||'',pass:f.pass||'',mediaReady:!!(f.loaded||f.cameraReady)},details:{frameCount:f.frameCount||0,selectedAnchorFrame:f.selectedAnchorFrame??null,reviewIndex:f.reviewIndex||0,proposalCount:f.proposalCount||0,boundaryReady:!!f.boundaryReady,fitRevision:f.fitRevision??null,undoCount:f.undoCount||0,redoCount:f.redoCount||0},regions:{source,job:!ownedJob?'idle':f.paused?'paused':'running',review:f.reviewOpen?'reviewing':f.boundaryReady?'ready':'needs-boundaries',pointer:f.pendingAnchor?'pending':f.pointerMode||'navigate',calibration:f.scalePicking?'marking':f.scaleSuggestion?'suggested':f.calibrated?'calibrated':'unset',results:result,playback:f.seeking?'seeking':f.playing?'playing':'paused',batch:f.batchPhase||'idle'},capabilities,violations});
  }
  class Epoch{
    constructor(){this.value=0;}
    begin(){return ++this.value;}
    cancel(){this.value++;}
    current(token){return token===this.value;}
  }
  function create(read,handlers={}){
    let snapshot=null,key='',revision=0,regionKey='';const listeners=new Set(),pending=new Set(),history=[];
    const record=event=>{history.push({...event,time:Date.now()});if(history.length>64)history.shift();};
    const refresh=()=>{
      const next=project({...read(),startPending:pending.has('analysis.start')}),signature=JSON.stringify([next,[...pending]]);if(signature===key)return snapshot;
      key=signature;snapshot=freeze({...next,revision:++revision,pendingCommands:[...pending]});
      const transitionKey=JSON.stringify([next.context.clipId,next.context.jobId,next.context.stage,next.regions]);
      if(transitionKey!==regionKey){regionKey=transitionKey;record({type:'state',context:next.context,regions:next.regions});}
      for(const listener of [...listeners])try{listener(snapshot);}catch(error){console.error('Workspace state subscriber failed',error);}
      return snapshot;
    };
    const send=async command=>{
      const type=typeof command?.type==='string'?command.type:'',current=refresh(),reject=(code,reason)=>{record({type:'command',command:type,ok:false,code});return{ok:false,code,reason,snapshot:refresh()};};
      if(!commands.includes(type)||!handlers[type])return reject('unknown-command','This action is not supported.');
      if(command.expected&&(command.expected.revision!=null&&command.expected.revision!==current.revision||['clipId','jobId','frame'].some(k=>command.expected[k]!=null&&command.expected[k]!==current.context[k])))return reject('stale-context','The video, analysis, or selected frame changed. Read the current state and retry.');
      if(pending.has(type))return reject('command-in-flight','This action is already in progress.');
      const capability=current.capabilities[type];if(!capability.enabled)return reject(capability.code,capability.reason);
      pending.add(type);refresh();
      let outcome;
      try{await handlers[type](command);record({type:'command',command:type,ok:true});outcome={ok:true,code:'completed'};}
      catch(error){const code=error?.code==='cancelled'?'cancelled':'action-failed';record({type:'command',command:type,ok:false,code});outcome={ok:false,code,reason:error?.message||String(error)};}
      finally{pending.delete(type);refresh();}
      return {...outcome,snapshot:refresh()};
    };
    return{getSnapshot:refresh,refresh,send,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},getHistory:()=>structuredClone(history)};
  }
  return{project,create,Epoch,commands};
});
