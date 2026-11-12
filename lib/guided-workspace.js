/* Single-workspace controller. All media and session records stay on this device. */
(function(){
  'use strict';const api=window.__wormez;if(!api)return;const S=api.state,$=id=>document.getElementById(id),stages=['videos','setup','fit','analyze','results'];
  S.workspaceStage='videos';S.analysisChoices={movement:true,bending:true,curvature:true};
  const panel=document.createElement('section');panel.className='panel';panel.id='measurementSetup';panel.innerHTML='<h2>Analysis</h2><p class="help">Movement, bending traces, RMS, frequency and curvature are included automatically. Signed bends use image coordinates, not anatomical dorsal/ventral sides.</p><p id="fitCacheNote" class="help"></p>';
  document.querySelector('.workspace>.controls').prepend(panel);
  const body=document.createElement('section');body.className='panel';body.id='bodyAnalysisResults';body.hidden=true;body.innerHTML='<h2>Body analysis</h2><p id="bodyAnalysisSummary" class="help"></p><label id="bendChoiceLabel">Bend <select id="bendChoice" aria-label="Bend trace position"></select></label><canvas id="bendTraceCanvas" width="900" height="260" tabindex="0" aria-label="Bend trace synchronized to video"></canvas><div id="bodyFrameReadout" class="help"></div><button id="exportBodyCsv" class="btn pill">Body analysis CSV</button>';
  const existing=$('analysisResults');existing.after(body);
  for(let i=1;i<=11;i++){const o=document.createElement('option');o.value=i-1;o.textContent='Bend '+i;$('bendChoice').append(o);}$('bendChoice').value='5';
  const flow=document.createElement('div');flow.className='guided-actions';flow.innerHTML='<span id="workspaceNotice" class="help" role="status"></span>';$('runBtn').parentElement.append(flow);const reviewIssue=document.createElement('button');reviewIssue.id='reviewNextIssue';reviewIssue.className='btn pill';reviewIssue.textContent='Review next issue';reviewIssue.onclick=()=>{const issues=S.track.filter(p=>!WormTracker.accepted(p)||p.anatomy&&!p.anatomy.head),point=issues.find(p=>p.frame>S.currentFrame)||issues[0];if(point){api.seekToFrame(point.frame);notice(WormTracker.accepted(point)?'Head identity needs review. Use H or T to identify an endpoint.':'Center unavailable. Place an anchor on the larva or mark an unavailable interval.');}};flow.prepend(reviewIssue);const controls=document.querySelector('.workspace>.controls');controls.insertBefore($('scalePane'),$('setupPanel'));
  const mask=document.createElement('button');mask.id='toggleMask';mask.className='btn ghost';mask.textContent='Mask preview';mask.setAttribute('aria-pressed','false');mask.title='Detected silhouette; the white curve is the fitted display outline';document.querySelector('.display-toggles').append(mask);
  mask.onclick=()=>{S.showMask=!S.showMask;mask.setAttribute('aria-pressed',String(S.showMask));api.redraw?.();};
  const folder=document.createElement('input');folder.type='file';folder.multiple=true;folder.hidden=true;folder.id='folderInput';folder.setAttribute('webkitdirectory','');document.body.append(folder);
  const queuePanel=document.createElement('section');queuePanel.id='videoQueue';queuePanel.className='panel video-queue';queuePanel.hidden=true;queuePanel.innerHTML='<div class="queue-heading"><h2>Video folder</h2><span id="batchProgress" role="status"></span></div><p id="batchHelp" class="help">Review setup for every video, then run the ready clips.</p><div class="queue-actions"><button id="reviewNextVideo" class="btn pill">Review next video</button><button id="runVideoBatch" class="btn primary pill">Run Batch</button><button id="stopVideoBatch" class="btn pill" hidden>Stop Batch</button><button id="exportVideoBatch" class="btn pill">Download results ZIP</button></div><div id="queueRows" class="queue-rows" role="list" aria-label="Video queue"></div>';
  document.querySelector('.workspace').before(queuePanel);
  let dbPromise;function database(){return dbPromise??=new Promise((resolve,reject)=>{const r=indexedDB.open('wormez-guided-workspace',1);r.onupgradeneeded=()=>r.result.createObjectStore('sessions');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function record(id,value){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('sessions',value===undefined?'readonly':'readwrite'),store=tx.objectStore('sessions'),r=value===undefined?store.get(id):store.put(value,id);let data;r.onsuccess=()=>data=r.result;tx.oncomplete=()=>resolve(data);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  function notice(text){$('workspaceNotice').textContent=text||'';}
  function navigate(stage){if(stage==='analyze')stage='fit';if(!stages.includes(stage))return;if(S.running&&stage!=='fit'){notice('Pause or stop fitting before changing stages.');return;}if(stage!=='videos'&&!S.loaded){notice('Load a video first.');return;}if(['analyze','results'].includes(stage)&&(!S.fitArtifact?.complete||dirty())){notice('Complete a valid body fit first.');return;}if(stage==='results'&&!S.analysisResult){try{calculate(false);}catch(error){notice(error.message);return;}}S.workspaceStage=stage;notice('');sync();}
  function dirty(){return !!S.fitArtifact&&S.fitArtifact.settingsKey!==api.fitSettingsKey();}
  function analysisKey(){return JSON.stringify({revision:S.fitArtifact?.revision,fps:S.fps,scale:S.mmPerPixel,unit:S.scaleConfig.unit,smooth:S.smoothWin,stationary:S.statThresh,turn:S.turnThresh,choices:S.analysisChoices});}
  function calculate(show=true){
    if(S.running||!S.fitArtifact?.complete||dirty())throw new Error('Complete the body fit before calculating measurements.');
    api.recompute();const choices={movement:true,bending:true,curvature:true};S.analysisChoices=choices;
    const factor=S.mmPerPixel?S.mmPerPixel/WormScale.units[S.scaleConfig.unit]:1,unit=S.mmPerPixel?(S.scaleConfig.unit==='um'?'µm':S.scaleConfig.unit):'px',key=analysisKey();
    if(S.analysisResult?.settingsKey!==key){S.analysisResult={version:1,trackingRevision:S.fitArtifact.revision,settingsKey:key,created:Date.now(),body:WormBodyAnalysis.analyze(S.fitArtifact.track,{...choices,fps:S.fps,factor,unit,stationaryPxPerSecond:S.statThresh*S.larvaLen})};}
    if(show)S.workspaceStage='results';renderBody();api.saveResult(false);queue.capture().catch(error=>notice(error.message));sync();return S.analysisResult;
  }
  function renderBody(){
    const result=S.analysisResult?.body;body.hidden=!result||(!S.analysisChoices.bending&&!S.analysisChoices.curvature);if(!result)return;
    const d=result.direction,mean=key=>{const v=result.rows.map(r=>r[key]).filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;},fmt=n=>n==null?'unavailable':n.toFixed(3);
    $('bodyAnalysisSummary').textContent=`Forward ${fmt(d.forwardDistance)} ${result.unit} · Backward ${fmt(d.backwardDistance)} ${result.unit} · Mean body length ${fmt(mean('length'))} ${result.unit} · Mean amplitude ${fmt(mean('amplitude'))} ${result.unit}. ${result.convention}`;
    $('bendChoiceLabel').hidden=!S.analysisChoices.bending;$('bendTraceCanvas').hidden=!S.analysisChoices.bending&&!S.analysisChoices.curvature;drawBodyChart();
  }
  function drawBodyChart(){
    const result=S.analysisResult?.body,c=$('bendTraceCanvas'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);if(!result)return;
    const index=+$('bendChoice').value,values=result.rows.map(r=>S.analysisChoices.bending?r.bends?.[index]??null:r.curvature.length?r.curvature.reduce((sum,p)=>sum+p.curvature,0)/r.curvature.length:null),valid=values.filter(Number.isFinite),range=Math.max(.01,...valid.map(Math.abs)),last=Math.max(1,S.totalFrames-1),pad=35;
    ctx.strokeStyle='#bbc2bb';ctx.beginPath();ctx.moveTo(pad,c.height/2);ctx.lineTo(c.width-pad,c.height/2);ctx.stroke();ctx.fillStyle=getComputedStyle(document.body).color;ctx.font='12px sans-serif';ctx.fillText(S.analysisChoices.bending?'Signed bend · degrees':`Curvature · 1/${result.unit}`,pad,18);
    ctx.strokeStyle='#3e6c4e';ctx.lineWidth=2;ctx.beginPath();let previous=null;result.rows.forEach((r,i)=>{const value=values[i];if(!Number.isFinite(value)){previous=null;return;}const x=pad+r.frame/last*(c.width-2*pad),y=c.height/2-value/range*(c.height/2-pad);if(previous!==r.frame-1)ctx.moveTo(x,y);else ctx.lineTo(x,y);previous=r.frame;});ctx.stroke();
    const x=pad+S.currentFrame/last*(c.width-2*pad);ctx.strokeStyle='#7d5ba6';ctx.beginPath();ctx.moveTo(x,pad);ctx.lineTo(x,c.height-pad);ctx.stroke();const row=result.rows.find(r=>r.frame===S.currentFrame),spectrum=result.frequencies.find(s=>S.currentFrame>=s.start&&S.currentFrame<=s.end)?.bends[index];
    $('bodyFrameReadout').textContent=`Frame ${S.currentFrame} · ${row?.direction||'unavailable'} · RMS ${result.rms[index]==null?'unavailable':result.rms[index].toFixed(2)+'°'} · Dominant frequency ${spectrum?spectrum.frequency.toFixed(3)+' Hz (resolution '+spectrum.resolution.toFixed(3)+' Hz)':'unavailable: needs a continuous four-second, 32-sample trace'}`;
  }
  $('bendChoice').onchange=drawBodyChart;
  const chart=$('bendTraceCanvas');chart.onclick=e=>{const r=chart.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*chart.width;api.seekToFrame(Math.round(Math.max(0,Math.min(1,(x-35)/(chart.width-70)))*(S.totalFrames-1)));};chart.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();api.seekToFrame(S.currentFrame+(e.key==='ArrowRight'?1:-1));}};
  let queueClip=null;
  async function open(file,snapshot){
    await api.openWorkspaceFile(file,snapshot);const clip=S.clipId,started=Date.now();
    await new Promise((resolve,reject)=>{const timer=setInterval(()=>{if(S.clipId!==clip){clearInterval(timer);reject(new Error('Video selection changed.'));}else if(!S.running&&!S.preparing&&S.loaded){clearInterval(timer);resolve();}else if(S.errors.length&&(!S.loaded||S.workflowPhase==='error')){clearInterval(timer);reject(new Error(S.errors.at(-1).message||'Cannot open video.'));}else if(Date.now()-started>180000){clearInterval(timer);reject(new Error('Video did not finish opening. Try its native decoder or skip it.'));}},100);});
    queueClip={id:WormVideoBatch.identity(file),clipId:S.clipId};S.analysisChoices={movement:true,bending:true,curvature:true};
  }
  const hooks={capture:item=>queueClip?.id===item.id&&queueClip.clipId===S.clipId?api.workspaceSnapshot():null,put:(id,value)=>record(id,value),get:id=>record(id),metadata:items=>{try{localStorage.setItem('wormez.videoQueue',JSON.stringify(items));}catch{}},open,fit:()=>api.fitBody(),analyze:()=>calculate(false),cancel:()=>api.cancelTracking(),summary:()=>({coverage:S.metrics?.coverage,gaps:WormTracker.intervals(S.track).length,distance:S.metrics?.totalDist,speed:S.metrics?.avgSpeed,duration:S.duration,calibrated:!!S.mmPerPixel}),exports:async()=>{if(!S.analysisResult)calculate(false);return{'points.csv':new TextEncoder().encode(api.buildPointsCsv()),'tracking-evidence.csv':new TextEncoder().encode(api.buildEvidenceCsv()),'body-analysis.csv':new TextEncoder().encode(WormBodyAnalysis.csv(S.analysisResult.body)),'results.xlsx':new Uint8Array(await(await api.buildXlsxBlob()).arrayBuffer()),'report.pdf':new Uint8Array(await(await api.buildPdfBlob()).arrayBuffer())};}};
  const queue=new WormVideoBatch.Queue(hooks);try{queue.items=JSON.parse(localStorage.getItem('wormez.videoQueue')||'[]');}catch{}
  async function attach(files){let old=[];try{old=JSON.parse(localStorage.getItem('wormez.videoQueue')||'[]');}catch{}await queue.attach(files,old);S.workspaceStage='videos';renderQueue();if(!queue.items.length)notice('No supported videos were found in that folder.');}
  async function loadFolder(){try{if(window.wormezDesktop?.openFolder){const files=await window.wormezDesktop.openFolder();if(files)await attach(files);}else{folder.value='';folder.click();}}catch(error){notice(error.message);}}
  folder.onchange=()=>attach(folder.files).catch(error=>notice(error.message));
  let queueSignature='';function renderQueue(){queuePanel.hidden=!queue.items.length;if(queuePanel.hidden)return;const signature=JSON.stringify(queue.items)+queue.activeId+queue.phase+queue.files.size+S.clipId;if(signature!==queueSignature){queueSignature=signature;const host=$('queueRows');host.replaceChildren();for(const item of queue.items){const row=document.createElement('div');row.className='queue-row';row.setAttribute('role','listitem');const select=document.createElement('button');select.className='btn ghost queue-select';select.textContent=item.path;select.disabled=queue.busy||!queue.files.has(item.id);select.setAttribute('aria-current',String(item.id===queue.activeId&&queueClip?.clipId===S.clipId));select.onclick=()=>queue.select(item.id).then(()=>{navigate('setup');renderQueue();}).catch(error=>notice(error.message));const status=document.createElement('span');status.textContent=item.status+(item.coverage!=null?' · '+Math.round(item.coverage*100)+'%':'')+(item.calibrated?' · calibrated':'');const skip=document.createElement('button');skip.className='btn ghost';skip.textContent='Skip';skip.disabled=queue.busy;skip.onclick=()=>queue.skip(item.id).then(renderQueue).catch(error=>notice(error.message));row.append(select,status,skip);if(item.error){const error=document.createElement('small');error.textContent=item.error;row.append(error);}host.append(row);}}
    $('runVideoBatch').disabled=queue.busy||S.running||!queue.items.some(i=>i.status==='ready'&&queue.files.has(i.id));$('stopVideoBatch').hidden=!queue.running;$('reviewNextVideo').disabled=queue.busy||!queue.files.size;$('exportVideoBatch').disabled=queue.busy||!queue.files.size||!queue.items.some(i=>i.status==='complete');$('batchHelp').textContent=queue.files.size?'Review timing, scale and visible boundary anchors for every video. Only ready clips run.':'Reselect the original folder to reconnect the video files. Saved setup and completed results stay local.';$('batchProgress').textContent=queue.running?`${queue.completed}/${queue.total} videos complete · ${queue.eta==null?'Estimating time':Math.ceil(queue.eta)+' s remaining'}`:`${queue.items.length} videos`;
  }
  $('reviewNextVideo').onclick=async()=>{try{await queue.capture();const next=queue.items.find(i=>i.status==='needs-review'&&queue.files.has(i.id));if(next){await queue.select(next.id);navigate('setup');}else notice('Every available video has been reviewed.');renderQueue();}catch(error){notice(error.message);}};
  $('runVideoBatch').onclick=()=>queue.run().then(()=>{if(S.analysisResult)S.workspaceStage='results';renderQueue();}).catch(error=>notice(error.message));$('stopVideoBatch').onclick=()=>{queue.stop();renderQueue();};
  $('exportVideoBatch').onclick=async()=>{try{notice('Preparing local batch exports…');const entries=await queue.exportEntries();if(!window.fflate)throw new Error('Offline ZIP library did not load.');const zip=await new Promise((resolve,reject)=>fflate.zip(entries,{level:1},(error,data)=>error?reject(error):resolve(data)));await api.saveFile('wormez-batch.zip',new Blob([zip],{type:'application/zip'}));notice('Batch ZIP prepared.');}catch(error){notice(error.message);}};
  $('exportBodyCsv').onclick=()=>S.analysisResult&&api.saveFile('body-analysis.csv',WormBodyAnalysis.csv(S.analysisResult.body));
  const machine=WormWorkspaceState.create(()=>{
    const job=api.job,fit=S.fitArtifact,play=api.getPlaybackState(),history=api.getHistoryState(),fitStale=dirty();
    return{clipId:S.clipId,jobId:S.jobId,stage:S.workspaceStage,phase:S.workflowPhase,message:S.workflowMessage,pass:job?.pass,
      frame:S.currentFrame,frameCount:S.totalFrames,loaded:S.loaded,camera:S.isCamera||!!S.cameraStream,cameraReady:!!S.cameraStream,recording:S.mediaRecorder?.state==='recording',finalizing:S.workflowPhase==='finalizingRecording',
      running:S.running,preparing:S.preparing,paused:job?.paused,jobOwned:!!job&&job.clipId===S.clipId&&job.id===S.jobId,jobCancelled:job?.cancelled,
      ...play,selectedAnchorFrame:S.selectedAnchorFrame,pointerMode:S.pointerMode,pendingAnchor:S.pendingAnchor,editing:S.reviewAdjustingFrame!=null||!!S.landmarkMode||S.calibrating||S.kfMode,
      reviewOpen:!$('anchorReview').hidden,reviewHere:S.proposals[S.proposalReviewIndex]?.frame===S.currentFrame,reviewIndex:S.proposalReviewIndex,proposalCount:S.proposals.length,boundaryReady:api.boundaryReady(),
      scalePicking:S.scalePicking,scaleSuggestion:!!S.scaleSuggestion,calibrated:!!S.mmPerPixel,areaEditor:!!document.querySelector('dialog.reference-editor[open],dialog.video-edit-dialog[open]'),
      fitComplete:fit?.complete,fitStale,fitRevision:fit?.revision,trackCount:S.track.length,analysisPresent:!!S.analysisResult,analysisCurrent:!!fit?.complete&&!fitStale&&S.analysisResult?.trackingRevision===fit.revision&&S.analysisResult?.settingsKey===analysisKey(),
      batchBusy:queue.busy,batchPhase:queue.running&&queue.stopped?'stopping':!queue.busy&&queue.items.length&&!queue.files.size?'needs-folder':queue.phase,undoCount:history.undo,redoCount:history.redo};
  },{
    'analysis.start':()=>api.fitBody(),'analysis.pause':()=>api.actions.setAnalysisPaused(true),'analysis.resume':()=>api.actions.setAnalysisPaused(false),'analysis.stop':()=>api.actions.stopAnalysis(),
    'session.reset':()=>api.actions.resetSession(),'anchor.confirm':()=>api.actions.confirmPendingAnchor(),'anchor.cancel':()=>api.actions.cancelPendingAnchor(),
    'review.accept':()=>api.actions.acceptReviewAnchor(),'review.next':()=>api.actions.nextProposalReview(),'review.back':()=>api.actions.nextProposalReview(-1)
  });
  api.machine=machine;
  let lastFrame=-1,lastClip=-1,lastCaptureKey='',captureTimer=0;
  function scheduleCapture(){
    if(queue.busy||S.running||S.preparing||!S.loaded||queueClip?.clipId!==S.clipId||queueClip?.id!==queue.activeId)return;
    const key=JSON.stringify([queue.activeId,S.clipId,api.fitSettingsKey(),S.mmPerPixel,S.scaleConfig.preset,S.scaleConfig.value,S.scaleConfig.unit,S.fitArtifact?.revision,S.analysisResult?.settingsKey]);if(key===lastCaptureKey)return;
    lastCaptureKey=key;clearTimeout(captureTimer);const clip=S.clipId;captureTimer=setTimeout(()=>{if(clip!==S.clipId||queue.busy||S.running){lastCaptureKey='';return;}queue.capture().then(renderQueue).catch(error=>{lastCaptureKey='';notice(error.message);});},250);
  }
  function sync(){
    if(lastClip!==S.clipId){lastClip=S.clipId;lastFrame=-1;S.analysisChoices={movement:true,bending:true,curvature:true};}
    if(S.workspaceStage==='analyze')S.workspaceStage='fit';if(!S.workspaceStage)S.workspaceStage=S.loaded?'setup':'videos';document.body.dataset.workspaceStage=S.workspaceStage;
    const fit=S.fitArtifact,stale=dirty();
    const key=analysisKey();if(fit?.complete&&!S.running&&!stale&&(!S.analysisResult||S.analysisResult.settingsKey!==key)){try{calculate(!S.analysisResult);}catch(error){notice(error.message);}}
    $('fitCacheNote').textContent=fit?stale?'Tracking settings changed. Re-analyze to update results.':'Measurements update automatically from the saved track.':'';
    $('reviewNextIssue').hidden=!['fit','results'].includes(S.workspaceStage)||!fit?.complete||!S.track.some(p=>!WormTracker.accepted(p)||p.anatomy&&!p.anatomy.head);
    const run=$('runBtn');if(!S.running)run.textContent=S.track.length?'Re-analyze':'Start analysis';run.hidden=(!S.loaded||S.workspaceStage==='videos')&&!S.running;
    if(S.analysisResult){body.hidden=S.workspaceStage!=='results'||(!S.analysisChoices.bending&&!S.analysisChoices.curvature);if(lastFrame!==S.currentFrame){lastFrame=S.currentFrame;drawBodyChart();}}else body.hidden=true;
    renderQueue();scheduleCapture();if(mask.getAttribute('aria-pressed')!==String(!!S.showMask))mask.setAttribute('aria-pressed',String(!!S.showMask));const state=machine.refresh();
    const action=S.running?'analysis.stop':'analysis.start',capability=state.capabilities[action];run.disabled=!capability.enabled;run.title=capability.enabled?(S.running?'Stop analysis':'Track approved anchor intervals'):capability.reason;
    $('resetBtn').disabled=!state.capabilities['session.reset'].enabled;
    if(!S.running)for(const id of ['exportPoints','exportXlsx','exportPdf'])$(id).disabled=!state.capabilities['results.export'].enabled;
  }
  // Check for boundary review completion without requiring every interior suggestion.
  $('acceptReviewAnchor').addEventListener('click',()=>{if(api.boundaryReady())$('finishAnchorReview').hidden=false;});
  api.workspace={navigate,calculate,loadFolder,queue,attach,renderBody,open,dirty,fit:()=>api.fitBody()};
  api.workspace.sync=sync;setInterval(sync,150);sync();
})();
