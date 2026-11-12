const {test,expect}=require('@playwright/test');const path=require('path');
test.setTimeout(120000);
async function open(page){await page.goto('file://'+path.resolve('WormEZ.html'));await page.evaluate(async()=>{await __wormez.runtime();});}
async function approveSetup(page){await page.waitForFunction(()=>__wormez.state.loaded&&(__wormez.state.headProposal||!__wormez.state.running));if(await page.evaluate(()=>!!__wormez.state.headProposal))await page.locator('#approveHead').click();}
async function reviewAll(page){for(let guard=0;guard<20&&await page.locator('#anchorReview').isVisible();guard++)await page.locator('#acceptReviewAnchor').click();await page.waitForFunction(()=>__wormez.state.workflowPhase==='ready');}
async function loadAndStart(page,file){await page.setInputFiles('#fileInput',file);await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);await reviewAll(page);await page.locator('#runBtn').click();await page.locator('#viewProcessing').click();}
async function fixture(page){await loadAndStart(page,'samples/clean_worm.webm');}
async function videoClick(page,x,y){await page.locator('#fitFrame').click();await page.locator('#overlayCanvas').scrollIntoViewIfNeeded();const p=await page.locator('#overlayCanvas').evaluate((c,{x,y})=>{const r=c.getBoundingClientRect(),s=Math.min(r.width/c.width,r.height/c.height);return{x:r.x+(r.width-c.width*s)/2+x*s,y:r.y+(r.height-c.height*s)/2+y*s};},{x,y});await page.mouse.click(p.x,p.y);const confirm=page.locator('#pointerConfirm');if(await confirm.isEnabled())await confirm.click();}
test('automatic area results follow calibration, preserve gaps, and clear on reset',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await expect(page.locator('#areaFeature')).toBeHidden();await fixture(page);await page.waitForFunction(()=>!__wormez.state.running);await expect(page.locator('#areaFeature')).toBeVisible();await expect(page.locator('#areaFeature')).not.toContainText('Optional');await expect(page.locator('#areaFeature summary')).toHaveCount(0);
 await page.waitForFunction(()=>document.getElementById('areaProgress').textContent.includes('verified outlines measured'));
 const expected=await page.evaluate(()=>__wormez.state.track.filter(p=>WormTracker.accepted(p)&&p.anatomy?.outline?.length).length);await expect(page.locator('#areaProgress')).toContainText(`${expected} verified outlines measured`);await expect(page.locator('#areaEstimate')).toContainText('Approximate mean larval area:');await expect(page.locator('#areaChart')).toHaveAttribute('data-area-unit','px²');const high=Number(await page.locator('#areaChart').getAttribute('data-area-high')),scans=await page.evaluate(()=>__wormez.areaDiagnostics.scans);
 const frame=await page.evaluate(()=>__wormez.state.track.find(p=>p.frame>=10&&WormTracker.accepted(p)&&p.anatomy?.outline?.length)?.frame);await page.locator('#scrubber').fill(String(frame));await expect(page.locator('#areaReadout')).toContainText(`Frame ${frame} · approximate area`);
 await page.evaluate(()=>{__wormez.state.mmPerPixel=.01;__wormez.state.scaleConfig.unit='cm';__wormez.recompute();});await expect(page.locator('#areaReadout')).toContainText('cm²');await expect(page.locator('#areaEstimate')).toContainText('cm²');await expect(page.locator('#areaChart')).toHaveAttribute('data-area-unit','cm²');expect(Number(await page.locator('#areaChart').getAttribute('data-area-high'))).toBeCloseTo(high*1e-6,10);expect(await page.evaluate(()=>__wormez.areaDiagnostics.scans)).toBe(scans);require('node:fs').mkdirSync('tests/area-results-validation',{recursive:true});await page.locator('#areaFeature').screenshot({path:'tests/area-results-validation/calibrated-fixture.png'});await page.setViewportSize({width:390,height:900});await expect.poll(()=>page.locator('#areaChart').evaluate(c=>Math.abs(c.width-c.clientWidth*Math.min(2,devicePixelRatio||1)))) .toBeLessThan(2);await page.locator('#areaFeature').screenshot({path:'tests/area-results-validation/compact-fixture.png'});
 await page.evaluate(f=>{__wormez.state.track.find(p=>p.frame===f).status='uncertain';__wormez.recompute();},frame);await page.waitForFunction(n=>__wormez.areaDiagnostics.samples===n,expected-1);await expect(page.locator('#areaReadout')).toContainText('no verified outline here');expect(Number(await page.locator('#areaChart').getAttribute('data-segments'))).toBeGreaterThan(1);
 await page.locator('#resetBtn').click();await expect(page.locator('#areaFeature')).toBeHidden();expect(await page.evaluate(()=>__wormez.areaDiagnostics.samples)).toBe(0);expect(errors).toEqual([]);await page.screenshot({path:'test-results/automatic-area-reset.png'});
});
test('automatic analysis, progress, zoom views and landmark key',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await fixture(page);
 await expect(page.locator('#analysisProgress')).toBeVisible();expect(await page.evaluate(()=>__wormez.state.headProposal)).toBe(null);
 await page.waitForFunction(()=>!__wormez.state.running);expect(await page.evaluate(()=>__wormez.state.track.length)).toBe(60);
 expect(await page.evaluate(()=>__wormez.state.track.filter(p=>p.anatomy?.head).length)).toBeGreaterThan(45);
 await expect(page.locator('#analysisResults')).toBeVisible();await expect(page.locator('#verificationPane')).toBeVisible();
 for(const [id,letter] of [['headBtn','H'],['centerBtn','C'],['tailBtn','T']]){await expect(page.locator(`#${id} .landmark-badge`)).toHaveText(letter);await expect(page.locator(`#${id} i`)).toHaveCount(0);}
 expect(await page.locator('#headPane button:visible .landmark-badge').allTextContents()).toEqual(['H','C','T']);
 await expect(page.locator('#analysisProgress')).toBeHidden();await expect(page.locator('#landmarkKey')).toContainText('Head H');await expect(page.locator('#legBtn')).toHaveCount(0);
 const saved=await page.evaluate(()=>JSON.stringify(__wormez.state.track));
 await page.locator('#fitFrame').click();await page.locator('#zoomLevel').fill('3');await page.locator('#autoZoom').click();await page.locator('#pathwayBtn').click();await page.locator('#pathwayBtn').click();
 expect(await page.evaluate(()=>JSON.stringify(__wormez.state.track))).toBe(saved);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('Petri-dish scale, units, exports, reset and anchor edits support undo/redo',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await fixture(page);await page.waitForFunction(()=>!__wormez.state.running);
 await page.locator('#scalePreset').selectOption('petri');await page.locator('#scaleValue').fill('100');await page.locator('#scaleValue').blur();await page.locator('#markScale').click();for(const [x,y] of [[240,100],[184.721,176.085],[95.279,147.023],[95.279,52.977],[184.721,23.915]])await videoClick(page,x,y);await expect(page.locator('#confirmDish')).toBeVisible();await page.locator('#confirmDish').click();
 const ratio=await page.evaluate(()=>__wormez.state.mmPerPixel);expect(ratio).toBeCloseTo(.625,2);
 await page.locator('#scaleUnit').selectOption('cm');await expect(page.locator('#scaleValue')).toHaveValue('10');expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBe(ratio);await expect(page.locator('#uTotal')).toHaveText('cm');expect(await page.evaluate(()=>__wormez.buildSeries().uDist)).toBe('cm');
 const exports=await page.evaluate(async()=>{const s=__wormez.buildSeries(),wb=new ExcelJS.Workbook();await wb.xlsx.load(await (await __wormez.buildXlsxBlob()).arrayBuffer());return{last:s.recs.at(-1),columns:wb.getWorksheet('Data').getRow(1).values,summary:wb.getWorksheet('Summary').getSheetValues()};});expect(exports.last.physical_unit).toBe('cm');expect(exports.last.cumulative_physical).toBeCloseTo(exports.last.cum_px*(ratio/10),2);expect(exports.columns).toContain('head_x_physical');expect(JSON.stringify(exports.summary)).toContain('petri');
 await page.locator('#scaleValue').fill('20');await page.locator('#scaleValue').blur();expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBeCloseTo(ratio*2,8);
 await page.locator('#undoBtn').click();expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBe(ratio);await page.locator('#redoBtn').click();expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBeCloseTo(ratio*2,8);
 await page.keyboard.press('Control+z');expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBe(ratio);await page.keyboard.press('Control+Shift+z');expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBeCloseTo(ratio*2,8);
 await page.locator('#resetBtn').click();expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBe(null);await page.locator('#undoBtn').click();expect(await page.evaluate(()=>[__wormez.state.track.length,__wormez.state.mmPerPixel])).toEqual([60,ratio*2]);
 const before=await page.evaluate(()=>__wormez.state.track[15]);await page.evaluate(()=>{const p=__wormez.state.track[15];__wormez.correctAnchor(15,p.x+1,p.y);});await page.waitForFunction(()=>!__wormez.state.running);expect(await page.evaluate(()=>__wormez.state.track[15].status)).toBe('manual');
 await page.locator('#undoBtn').click();expect(await page.evaluate(()=>__wormez.state.track[15])).toEqual(before);await page.locator('#redoBtn').click();expect(await page.evaluate(()=>__wormez.state.track[15].status)).toBe('manual');
 const saved=await page.evaluate(()=>__wormez.state.track[15]);await page.evaluate(()=>{const p=__wormez.state.track[15];__wormez.correctAnchor(15,p.x+2,p.y);});await page.locator('#undoBtn').click();await page.waitForTimeout(250);expect(await page.evaluate(()=>__wormez.state.track[15])).toEqual(saved);expect(await page.evaluate(()=>__wormez.state.running)).toBe(false);
 await page.locator('#redoBtn').click();await page.waitForFunction(()=>!__wormez.state.running);expect(await page.evaluate(()=>__wormez.state.track[15].x)).toBeCloseTo(saved.x+2,6);
 expect(errors).toEqual([]);
});
test('Reset and replacement cancel initialization and isolate history',async({page})=>{
 await open(page);await fixture(page);await page.locator('#resetBtn').click();await page.waitForTimeout(200);
 expect(await page.evaluate(()=>[__wormez.state.running,__wormez.state.headProposal,__wormez.state.track.length])).toEqual([false,null,0]);
 await page.setInputFiles('#fileInput',[]);await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);await reviewAll(page);await page.locator('#runBtn').click();await page.setInputFiles('#fileInput',{name:'replacement.webm',mimeType:'video/webm',buffer:require('fs').readFileSync('samples/clean_worm.webm')});
 await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);await expect(page.locator('#undoBtn')).toBeDisabled();await expect(page.locator('#redoBtn')).toBeDisabled();expect(await page.evaluate(()=>__wormez.state.track.length)).toBe(0);
});
test('reset returns to the exact first frame; explicit anchors work without manual body-length tools',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await fixture(page);await page.locator('#resetBtn').click();
 await page.waitForFunction(()=>Math.abs(document.getElementById('videoEl').currentTime-.5/__wormez.state.fps)<.001&&!document.getElementById('videoEl').seeking);
 await expect(page.locator('#boxBtn')).toHaveCount(0);await expect(page.locator('#calibBtn')).toBeHidden();await page.locator('#fitFrame').click();
 await page.locator('#pointerPlaceAnchor').click();const b=await page.locator('#overlayCanvas').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await expect(page.locator('#pointerConfirm')).toBeEnabled();await page.locator('#pointerConfirm').click();expect(await page.evaluate(()=>__wormez.state.keyframes.some(k=>k.frame===0&&k.origin==='manual'))).toBe(true);
 await page.keyboard.down('Shift');await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();await page.mouse.move(b.x+80,b.y+70);await page.mouse.up();await page.keyboard.up('Shift');expect(await page.evaluate(()=>__wormez.state.crop)).toBe(null);await expect(page.locator('#cropClear')).toBeHidden();expect(errors).toEqual([]);
});
test('offline CV, double pass, pause inspection, playback, correction and exports',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,route=>route.abort());await open(page);await fixture(page);
  await expect(page.locator('#pauseBtn')).toBeEnabled();await page.locator('#pauseBtn').click();
  await expect(page.locator('#pauseBtn')).toHaveText('Resume tracking');
  const before=await page.evaluate(()=>__wormez.job.pass);await page.waitForTimeout(150);expect(await page.evaluate(()=>__wormez.job.pass)).toBe(before);
  await page.locator('#nextBtn').click();await page.locator('#pauseBtn').click();
  await page.waitForFunction(()=>!__wormez.state.running);
  console.log(await page.locator('#statusText').textContent());
  const result=await page.evaluate(()=>({n:__wormez.state.track.length,coverage:__wormez.state.metrics?.coverage,frames:__wormez.state.totalFrames,keys:__wormez.state.keyframes}));
  expect(result.n).toBe(result.frames);expect(result.coverage).toBeGreaterThan(.8);expect(result.keys.length).toBeGreaterThan(1);
  await page.locator('#scrubber').fill('0');await page.locator('#playBtn').click();await page.waitForTimeout(160);expect(await page.evaluate(()=>document.getElementById('videoEl').currentTime)).toBeGreaterThan(.05);await page.locator('#playBtn').click();await expect(page.locator('#playBtn')).toHaveText('Play ▶');
  const exports=await page.evaluate(async()=>{const a=__wormez;const series=a.buildSeries();const x=await a.buildXlsxBlob();const pdf=a.buildPdfBlob();const wb=new ExcelJS.Workbook();await wb.xlsx.load(await x.arrayBuffer());return {rows:wb.getWorksheet('Data').rowCount,columns:wb.getWorksheet('Data').getRow(1).values,images:wb.model.media.length,pdf:await pdf.slice(0,5).text(),last:series.recs.at(-1),duration:a.state.metrics.totalT};});
  expect(exports.rows).toBe(result.n+1);expect(exports.columns).toContain('verification');expect(exports.images).toBeGreaterThan(3);expect(exports.pdf).toBe('%PDF-');expect(exports.last.time_s).toBeCloseTo(exports.duration,2);
  const download=page.waitForEvent('download');await page.locator('#exportPoints').click();const csv=await download;expect(csv.suggestedFilename()).toContain('_points.csv');
  await page.evaluate(()=>{const p=__wormez.state.track[Math.floor(__wormez.state.track.length/2)];__wormez.correctAnchor(p.frame,p.x,p.y);});await page.waitForFunction(()=>!__wormez.state.running);expect(await page.evaluate(()=>__wormez.state.keyframes.some(p=>p.origin==='manual'))).toBe(true);
  await page.locator('#resetBtn').click();expect(await page.evaluate(()=>__wormez.state.track.length)).toBe(0);await expect(page.locator('#scrubber')).toHaveValue('0');expect(errors).toEqual([]);
});
test('reset and clip replacement cancel a paused run',async({page})=>{
  await open(page);await fixture(page);await expect(page.locator('#pauseBtn')).toBeEnabled();
  await page.locator('#pauseBtn').click();await page.locator('#resetBtn').click();await page.waitForTimeout(250);
  expect(await page.evaluate(()=>[__wormez.state.track.length,__wormez.state.keyframes.length,__wormez.state.running])).toEqual([0,0,false]);
  // Clear the input to reproduce choosing the same file again in the picker.
  await page.setInputFiles('#fileInput',[]);await fixture(page);await expect(page.locator('#pauseBtn')).toBeEnabled();
  await page.locator('#pauseBtn').click();await page.evaluate(()=>__wormez.state.crop={x:1,y:1,w:3,h:3});
  await page.setInputFiles('#fileInput','samples/synthetic_worm.webm');await approveSetup(page);await page.waitForFunction(()=>!__wormez.state.running);
  expect(await page.evaluate(()=>__wormez.state.crop)).toBe(null);
});
test('backward pass pauses, Stop cancels, and manual edits preserve other intervals',async({page})=>{
  await open(page);await fixture(page);await page.waitForFunction(()=>__wormez.job?.pass.includes('backward'));
  await page.locator('#pauseBtn').click();const frame=await page.evaluate(()=>__wormez.state.currentFrame);await page.waitForTimeout(200);expect(await page.evaluate(()=>__wormez.state.currentFrame)).toBe(frame);
  await page.locator('#pauseBtn').click();await page.waitForFunction(()=>!__wormez.state.running);
  const saved=await page.evaluate(()=>{const s=__wormez.state;const p=s.track[Math.floor(s.track.length/2)];const first=s.track[0];__wormez.correctAnchor(p.frame,p.x+1,p.y);return first;});
  await page.waitForFunction(()=>!__wormez.state.running);expect(await page.evaluate(()=>__wormez.state.track[0])).toEqual(saved);
  await page.evaluate(()=>{void __wormez.runVerification();});await page.waitForFunction(()=>__wormez.state.running);await page.locator('#pauseBtn').click();await page.locator('#runBtn').click();await expect(page.locator('#pauseBtn')).toBeDisabled();expect(await page.evaluate(()=>__wormez.job)).toBe(null);
});
test('uncertain gaps exclude distance, speed and stationary time in metrics and export',async({page})=>{
  await open(page);const result=await page.evaluate(()=>{const a=__wormez,s=a.state;s.fps=1;s.larvaLen=4;s.smoothWin=1;s.track=[{frame:0,x:0,y:0,status:'verified'},{frame:1,x:1,y:0,status:'verified'},{frame:2,x:100,y:0,status:'uncertain'},{frame:3,x:200,y:0,status:'verified'},{frame:4,x:200,y:0,status:'verified'}];a.recompute();return{metrics:s.metrics,rows:a.buildSeries().recs};});
  expect(result.metrics.totalDist).toBe(1);expect(result.metrics.validT).toBe(2);expect(result.metrics.statT).toBe(1);expect(result.metrics.uncertainT).toBe(2);expect(result.rows[2].speed_px_s).toBe('');expect(result.rows[3].speed_px_s).toBe('');expect(result.rows.at(-1).time_s).toBe(4);expect(result.rows.at(-1).cum_px).toBe(1);
});
test('OpenCV detects clean worms, rejects ambiguity, and checks motion in both directions',async({page})=>{
 await open(page);const r=await page.evaluate(async()=>{const {cv}=await __wormez.runtime(),T=WormTracker;const c=document.createElement('canvas');c.width=320;c.height=200;const ctx=c.getContext('2d');
 const image=(x,second=false,empty=false)=>{ctx.fillStyle='#504030';ctx.fillRect(0,0,320,200);if(!empty){ctx.fillStyle='#fff3d4';ctx.beginPath();ctx.ellipse(x,100,25,8,.3,0,7);ctx.fill();if(second){ctx.beginPath();ctx.ellipse(250,100,25,8,.3,0,7);ctx.fill();}}return cv.matFromImageData(ctx.getImageData(0,0,320,200));};
 const a=image(80),b=image(84),two=image(80,true),none=image(80,false,true);
 try{const p=T.candidates(cv,a,null,null)[0],q=T.flow(cv,a,b,p,p.length),back=T.flow(cv,b,a,q,p.length);return {found:!!p,dx:q.x-p.x,roundtrip:T.distance(back,p),ambiguous:T.choose(T.candidates(cv,two,null,null),null,Infinity)===null,empty:T.candidates(cv,none,null,null).length};}finally{for(const m of[a,b,two,none])m.delete();}});
 expect(r.found).toBe(true);expect(r.dx).toBeCloseTo(4,0);expect(r.roundtrip).toBeLessThan(1);expect(r.ambiguous).toBe(true);expect(r.empty).toBe(0);
});
test('magnified endpoint edits, tail exports, center corrections and history',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await fixture(page);await page.waitForFunction(()=>!__wormez.state.running);
 expect(await page.evaluate(()=>__wormez.state.track.filter(p=>p.anatomy).length)).toBeGreaterThan(50);
 await page.locator('#scrubber').fill('0');await page.waitForFunction(()=>!document.getElementById('videoEl').seeking);
 const clickEnd=async()=>{await page.locator('#overlayCanvas').scrollIntoViewIfNeeded();const xy=await page.locator('#overlayCanvas').evaluate(c=>{const a=__wormez.state.track[0].anatomy.ends[0],v=__wormez.state.viewRect,r=c.getBoundingClientRect();return{x:r.x+(a.x-v.x)/v.w*r.width,y:r.y+(a.y-v.y)/v.h*r.height};});await page.mouse.click(xy.x,xy.y);};
 await page.locator('#headBtn').click();await clickEnd();await page.locator('#approveHead').click();await page.waitForFunction(()=>!__wormez.state.running);
 expect(await page.evaluate(()=>__wormez.state.track[0].anatomy.headStatus)).toBe('manual');
 const data=await page.evaluate(async()=>{const a=__wormez,wb=new ExcelJS.Workbook();await wb.xlsx.load(await (await a.buildXlsxBlob()).arrayBuffer());return{columns:wb.getWorksheet('Data').getRow(1).values,first:a.buildSeries().recs[0]};});expect(data.columns).toContain('tail_status');expect(data.columns).not.toContain('leg_status');expect(data.first.tail_x_px).not.toBe('');
 await page.locator('#scrubber').fill('0');await page.waitForFunction(()=>!document.getElementById('videoEl').seeking);await page.locator('#tailBtn').click();await clickEnd();await page.waitForFunction(()=>!__wormez.state.running);expect(await page.evaluate(()=>__wormez.state.tailSeeds.length)).toBe(1);
 await page.locator('#undoBtn').click();expect(await page.evaluate(()=>__wormez.state.tailSeeds.length)).toBe(0);await page.locator('#redoBtn').click();expect(await page.evaluate(()=>__wormez.state.tailSeeds.length)).toBe(1);
 await page.locator('#resetBtn').click();expect(await page.evaluate(()=>[__wormez.state.headSeeds.length,__wormez.state.tailSeeds.length])).toEqual([0,0]);expect(errors).toEqual([]);
});
test('tiny targets keep local pixels and camera motion excludes the animal',async({page})=>{
 await open(page);const r=await page.evaluate(async()=>{
  const {cv}=await __wormez.runtime(),c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d');
  const make=(shift=0,texture=false)=>{ctx.fillStyle='#333';ctx.fillRect(0,0,c.width,c.height);if(texture){ctx.fillStyle='#777';for(let j=0;j<5;j++)for(let i=0;i<8;i++)ctx.fillRect(30+i*140+shift,30+j*120,12,12);}ctx.fillStyle='#fff1cd';ctx.beginPath();ctx.ellipse(640+shift,360,10,3,.2,0,7);ctx.fill();return cv.matFromImageData(ctx.getImageData(0,0,c.width,c.height));};
  const a=make(),b=make(2),ta=make(0,true),tb=make(8,true),blank=make();
  try{const p=WormTracker.candidates(cv,a,null,null)[0],local=WormTracker.localCandidates(cv,a,p,null,p,32)[0],f=WormTracker.flow(cv,a,b,p,p.length);return{length:p.length,local:!!local,dx:f&&f.x-p.x,camera:WormTracker.cameraMotion(cv,ta,tb,{...p,length:p.length}),animalOnly:WormTracker.cameraMotion(cv,a,b,{...p,length:p.length})};}finally{for(const m of[a,b,ta,tb,blank])m.delete();}
 });expect(r.length).toBeLessThan(25);expect(r.local).toBe(true);expect(r.dx).toBeCloseTo(2,0);expect(r.camera).toBeGreaterThan(6);expect(r.animalOnly).toBe(null);
});
test('zoomed center editing maps back to source pixels; decode errors stay visible',async({page})=>{
 await open(page);await fixture(page);await page.waitForFunction(()=>!__wormez.state.running);await page.locator('#scrubber').fill('0');await page.waitForFunction(()=>!document.getElementById('videoEl').seeking);
 await page.locator('#autoZoom').click();await page.locator('#zoomLevel').fill('2');await page.locator('#canvasWrap').scrollIntoViewIfNeeded();
 const box=await page.locator('#overlayCanvas').boundingBox(),beforePan=await page.evaluate(()=>({...__wormez.state.viewRect}));await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.keyboard.down('Control');await page.mouse.wheel(0,-260);await page.keyboard.up('Control');expect(await page.evaluate(()=>__wormez.state.zoomScale)).toBeGreaterThan(2);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2);await page.mouse.up();const afterPan=await page.evaluate(()=>({...__wormez.state.viewRect}));expect(Math.abs(afterPan.x-beforePan.x)+Math.abs(afterPan.y-beforePan.y)).toBeGreaterThan(1);
 await page.locator('#centerBtn').click();
 const target=await page.locator('#overlayCanvas').evaluate(c=>{const p=__wormez.state.track[0],v=__wormez.state.viewRect,r=c.getBoundingClientRect();return{x:p.x+1,y:p.y,screenX:r.x+(p.x+1-v.x)/v.w*r.width,screenY:r.y+(p.y-v.y)/v.h*r.height};});await page.mouse.click(target.screenX,target.screenY);await page.waitForFunction(()=>!__wormez.state.running);expect(Math.abs(await page.evaluate(()=>__wormez.state.track[0].x)-target.x)).toBeLessThan(.25);
 await page.setInputFiles('#fileInput',{name:'broken.mp4',mimeType:'video/mp4',buffer:Buffer.from('invalid video')});await expect(page.locator('#errorPanel')).toBeVisible();await expect(page.locator('#errorList')).toContainText('Cannot decode');await expect(page.locator('#analysisProgress')).toBeHidden();
});
test('stationary and occluded clips retain timing, gaps and honest orientation',async({page})=>{
 await open(page);await loadAndStart(page,'samples/stationary_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
 const stationary=await page.evaluate(()=>({n:__wormez.state.track.length,m:__wormez.state.metrics,heads:__wormez.state.track.filter(p=>p.anatomy?.head).length,rows:__wormez.buildSeries()?.recs}));
 expect(stationary.n).toBe(60);expect(stationary.m.coverage).toBeGreaterThan(.95);expect(stationary.m.totalDist).toBeLessThan(.1);expect(stationary.heads).toBe(0);expect(stationary.rows.at(-1).time_s).toBeCloseTo(59/30,2);
 await loadAndStart(page,'samples/occlusion_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
 const r=await page.evaluate(()=>({points:__wormez.state.track,keys:__wormez.state.keyframes,rows:__wormez.buildSeries()?.recs}));expect(r.points.length).toBe(60);
 for(let i=22;i<=29;i++){expect(r.points[i].status).toBe('uncertain');expect(r.keys.some(k=>k.frame===i)).toBe(false);expect(r.rows[i].speed_px_s).toBe('');}
 expect(r.points.slice(35).filter(p=>p.status==='verified').length).toBeGreaterThan(20);
});
test('independent backward discovery separates a stationary distractor',async({page})=>{
 await open(page);await loadAndStart(page,'samples/distractor_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
 const r=await page.evaluate(()=>({coverage:__wormez.state.metrics?.coverage,points:__wormez.state.track}));expect(r.coverage).toBeGreaterThan(.9);expect(r.points.every(p=>p.status==='uncertain'||p.x<160)).toBe(true);
});

test('reference detection withholds a small larva when contrast drops below its match gate',async({page})=>{
 await open(page);const result=await page.evaluate(async()=>{
  const {cv}=await __wormez.runtime(),c=document.createElement('canvas');c.width=160;c.height=100;const x=c.getContext('2d');
  const frame=level=>{x.fillStyle='#222';x.fillRect(0,0,160,100);x.fillStyle=`rgb(${level},${level},${level})`;x.beginPath();x.ellipse(80,50,10,3,0,0,Math.PI*2);x.fill();return cv.matFromImageData(x.getImageData(0,0,160,100));};
  const bright=frame(190),shadow=frame(125);try{const ref=WormTracker.candidates(cv,bright,null,null)[0],found=WormTracker.localCandidates(cv,shadow,ref,null,ref,32);return {found:found.length,x:found[0]?.x,referenceX:ref.x,threshold:found[0]?.threshold};}finally{bright.delete();shadow.delete();}
 });expect(result.found).toBe(0);expect(Math.abs(result.referenceX-80)).toBeLessThan(1);
});
test('the approved last visible anchor is the backward-pass seed',async({page})=>{
 await open(page);await loadAndStart(page,'samples/distractor_worm.webm');await page.waitForFunction(()=>__wormez.state.endpointDiagnostics&&__wormez.state.running);
 const r=await page.evaluate(()=>{const s=__wormez.state;let end=s.totalFrames-1;while(s.unavailable.some(q=>end>=q.start&&end<=q.end))end--;return{end,last:s.endpointDiagnostics.last,key:s.keyframes.find(k=>k.frame===end)}});
 expect(r.key.origin).toBe('manual');expect(r.last.frame).toBe(r.end);expect(r.last.x).toBeCloseTo(r.key.x,6);
});
test('preflight anchors, unavailable intervals, ETA overlay and attention sound',async({page})=>{
 await open(page);await page.evaluate(()=>{window.testTones=0;window.AudioContext=class{currentTime=0;destination={};resume(){return Promise.resolve();}createOscillator(){return{frequency:{},connect(){},start(){window.testTones++;},stop(){}};}createGain(){return{connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}};}};});
 await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
 expect(await page.evaluate(()=>__wormez.state.track.length)).toBe(0);expect(await page.evaluate(()=>__wormez.state.proposals.length)).toBeGreaterThan(3);
 await expect(page.locator('#anchorReview')).toBeVisible();await expect(page.locator('#anchorReviewCount')).toContainText('Anchor 1 of');
 const proposalCount=await page.evaluate(()=>__wormez.state.proposals.length);expect(await page.locator('#anchorMarkers .anchor-marker').count()).toBe(proposalCount);
 const firstFrame=await page.evaluate(()=>__wormez.state.proposals[0].frame);expect(await page.evaluate(()=>__wormez.state.currentFrame)).toBe(firstFrame);
 await page.locator('#scrubber').fill('10');await expect(page.locator('#anchorReviewText')).toContainText('Viewing frame 10');await expect(page.locator('#acceptReviewAnchor')).toBeDisabled();await page.locator('#returnReviewAnchor').click();expect(await page.evaluate(()=>__wormez.state.currentFrame)).toBe(firstFrame);await expect(page.locator('#acceptReviewAnchor')).toBeEnabled();
 expect(await page.evaluate(()=>document.getElementById('overlayCanvas').width/__wormez.state.viewRect.w)).toBeGreaterThan(1);
 const reviewBounds=await page.evaluate(()=>{const r=anchorReview.getBoundingClientRect(),c=canvasWrap.getBoundingClientRect(),d=pointerDock.getBoundingClientRect();return{belowVideo:r.top>=c.bottom,beforeControls:r.bottom<=d.top};});expect(reviewBounds.belowVideo).toBe(true);expect(reviewBounds.beforeControls).toBe(true);await expect(page.locator('#overviewCanvas')).toHaveCount(0);
 await page.locator('#acceptReviewAnchor').click();expect(await page.evaluate(()=>__wormez.state.keyframes[0].origin)).toBe('manual');expect(await page.evaluate(()=>__wormez.state.running)).toBe(false);expect(await page.locator('#anchorMarkers .accepted').count()).toBeGreaterThan(0);
 const correction=await page.evaluate(()=>{const p=__wormez.state.proposals[__wormez.state.proposalReviewIndex];return{x:p.x,y:p.y,frame:p.frame};});await page.locator('#adjustReviewAnchor').click();
 expect(await page.locator('#viewMode').inputValue()).toBe('full');expect(await page.evaluate(()=>__wormez.state.viewRect.w)).toBe(await page.evaluate(()=>document.getElementById('overlayCanvas').width));await expect(page.locator('#kfHint')).toContainText('Edit anchor');
 await videoClick(page,correction.x,correction.y);await page.waitForTimeout(50);expect(await page.locator('#viewMode').inputValue()).toBe('follow');expect(await page.evaluate(f=>__wormez.state.keyframes.some(k=>k.frame===f&&k.origin==='manual'),correction.frame)).toBe(true);
 await page.locator('#scrubber').fill(String(correction.frame));await page.locator('#fitFrame').click();await expect(page.locator('#anatomyNote')).toContainText('Manual center selected');const blue=await page.locator('#overlayCanvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<d.length;i+=4)if(d[i+2]>180&&d[i+2]>d[i]+60&&d[i+3]>30)count++;return count;});expect(blue).toBe(0);
 await page.locator('#returnReviewAnchor').click();await reviewAll(page);await page.locator('#scrubber').fill('20');await page.locator('#markUnavailableStart').click();await page.locator('#scrubber').fill('25');await page.locator('#markUnavailableStart').click();
 await page.locator('#runBtn').click();await expect(page.locator('#analysisCurtain')).toBeVisible();await expect(page.locator('#analysisEta')).toContainText('remaining');
 const bounds=await page.evaluate(()=>{const a=analysisCurtain.getBoundingClientRect(),c=canvasWrap.getBoundingClientRect();return{inside:a.left>=c.left&&a.right<=c.right&&a.top>=c.top&&a.bottom<=c.bottom};});expect(bounds.inside).toBe(true);
 await page.locator('#viewProcessing').click();await expect(page.locator('#analysisCurtain')).toBeHidden();await page.locator('#pauseBtn').click();await page.locator('#showProgress').click();await expect(page.locator('#analysisEta')).toContainText('Paused');await page.locator('#pauseBtn').click();await page.locator('#viewProcessing').click();
 await page.waitForFunction(()=>!__wormez.state.running);const result=await page.evaluate(()=>({points:__wormez.state.track,tones:window.testTones}));expect(result.points.length).toBe(60);for(let f=20;f<=25;f++){expect(result.points[f].status).toBe('uncertain');expect(result.points[f].reason).toContain('Marked unavailable');}expect(result.tones).toBe(2);
});
test('guided workspace keeps review controls relevant and correction drag never places an anchor',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 await expect(page.locator('.app-identity')).toContainText('Larval motion analysis');await expect(page.locator('.workflow-status')).toContainText('Launch WormEZ.command');
 await expect(page.getByRole('button',{name:'How analysis works'})).toHaveCount(0);
 await expect(page.locator('.diagnostics-button')).toHaveCount(0);
 await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);await expect(page.locator('#anchorReview')).toBeVisible();
 await expect(page.locator('.workflow-status')).toContainText('Confirm the first and last visible anchors');
 await expect(page.locator('#anchorsPane')).toBeVisible();await expect(page.locator('#verificationPane')).toBeHidden();await expect(page.locator('#headPane')).toBeHidden();await expect(page.locator('#analysisResults')).toBeHidden();
 await page.setViewportSize({width:390,height:844});await expect(page.locator('#nextReviewAnchor')).toBeVisible();await page.setViewportSize({width:1440,height:1000});
 await page.locator('#adjustReviewAnchor').click();await page.locator('#zoomLevel').fill('3');
 const canvas=page.locator('#overlayCanvas'),box=await canvas.boundingBox(),count=await page.evaluate(()=>__wormez.state.keyframes.length);
 await page.mouse.move(box.x+box.width*.55,box.y+box.height*.55);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.6,{steps:5});await page.mouse.up();
 expect(await page.evaluate(()=>__wormez.state.keyframes.length)).toBe(count);expect(await page.evaluate(()=>Math.abs(__wormez.state.panOffset.x)+Math.abs(__wormez.state.panOffset.y))).toBeGreaterThan(0);
 await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await page.locator('#pointerConfirm').click();expect(await page.evaluate(()=>__wormez.state.keyframes.length)).toBe(count+1);
 expect(errors).toEqual([]);
});
test('visible boundary anchors gate analysis and redundant primary controls stay hidden',async({page})=>{
 await open(page);await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
 await expect(page.locator('#runBtn')).toBeDisabled();expect(await page.locator('button:visible').filter({hasText:'Start analysis'}).count()).toBe(1);
 await reviewAll(page);const boundaries=await page.evaluate(()=>{const s=__wormez.state,b=(()=>{let start=0,end=s.totalFrames-1;while(s.unavailable.some(r=>start>=r.start&&start<=r.end))start++;while(s.unavailable.some(r=>end>=r.start&&end<=r.end))end--;return{start,end};})();return{b,frames:s.keyframes.map(k=>k.frame),ready:!document.getElementById('runBtn').disabled};});
 expect(boundaries.frames).toContain(boundaries.b.start);expect(boundaries.frames).toContain(boundaries.b.end);expect(boundaries.ready).toBe(true);
 await expect(page.locator('#cropClear')).toBeHidden();await expect(page.locator('#clearTrack')).toBeHidden();await expect(page.locator('#kfClear')).toBeHidden();await expect(page.getByRole('button',{name:'Use Camera',exact:true})).toHaveCount(1);
});
test('pointer dock exposes explicit modes and pending anchor save/cancel',async({page})=>{
 await open(page);await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
 await expect(page.locator('#pointerDock')).toBeVisible();await expect(page.locator('#pointerNavigate')).toHaveCount(0);const dock=await page.locator('#pointerDock').boundingBox(),video=await page.locator('#canvasWrap').boundingBox();expect(dock.y).toBeGreaterThanOrEqual(video.y+video.height);await page.locator('#pointerPan').click();expect(await page.locator('#canvasWrap').getAttribute('data-pointer-mode')).toBe('pan');await page.locator('#pointerPan').click();expect(await page.locator('#canvasWrap').getAttribute('data-pointer-mode')).toBe('navigate');
 await expect(page.locator('#pointerPlaceAnchor .anchor-symbol')).toHaveCount(1);expect(await page.locator('#pointerPlaceAnchor').evaluate(el=>!!el.closest('.timeline-row'))).toBe(true);await page.locator('#pointerPlaceAnchor').click();expect(await page.locator('#canvasWrap').getAttribute('data-pointer-mode')).toBe('place-anchor');
 const canvas=page.locator('#overlayCanvas'),box=await canvas.boundingBox();await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);
 await expect(page.locator('#pointerConfirm')).toBeEnabled();await expect(page.locator('#pointerCancel')).toBeEnabled();await expect(page.locator('#pointerHint')).toContainText('Pending anchor');
 const before=await page.evaluate(()=>__wormez.state.keyframes.length);await page.locator('#pointerCancel').click();expect(await page.evaluate(()=>__wormez.state.keyframes.length)).toBe(before);expect(await page.locator('#canvasWrap').getAttribute('data-pointer-mode')).toBe('navigate');
 await page.locator('#pointerPlaceAnchor').click();await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await page.keyboard.press('Enter');expect(await page.evaluate(()=>__wormez.state.keyframes.length)).toBe(before+1);
 await page.setViewportSize({width:390,height:844});const compactDock=await page.locator('#pointerDock').boundingBox();expect(compactDock.x+compactDock.width).toBeLessThanOrEqual(390);await expect(page.locator('#pointerPan')).toBeVisible();
});
test('Auto-Zoom restores follow framing and timeline buttons jump between anchors',async({page})=>{
 await open(page);await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
 await page.locator('#fitFrame').click();expect(await page.locator('#viewMode').inputValue()).toBe('full');expect(await page.locator('#zoomLevel').getAttribute('min')).toBe('1');
 await page.locator('#autoZoom').click();expect(await page.locator('#viewMode').inputValue()).toBe('follow');expect(await page.locator('#autoZoom').getAttribute('aria-pressed')).toBe('true');expect(await page.evaluate(()=>__wormez.state.viewRect.w)).toBeLessThan(await page.evaluate(()=>overlayCanvas.width));
 const frames=await page.evaluate(()=>[...new Set(__wormez.state.proposals.map(p=>p.frame))].sort((a,b)=>a-b));expect(frames.length).toBeGreaterThan(1);
 await page.locator('#nextTimelineAnchor').click();expect(await page.evaluate(()=>__wormez.state.currentFrame)).toBe(frames.find(f=>f>0));
 await page.locator('#previousTimelineAnchor').click();expect(await page.evaluate(()=>__wormez.state.currentFrame)).toBe(frames[0]);
 await expect(page.locator('#pointerPlaceAnchor .anchor-symbol')).toHaveCount(1);
});
test('Re-analyze limits work to the selected manual-anchor interval',async({page})=>{
 await open(page);await fixture(page);await page.waitForFunction(()=>!__wormez.state.running);
 const before=await page.evaluate(()=>({...__wormez.state.track.at(-1)}));const anchors=await page.evaluate(()=>__wormez.state.keyframes.filter(p=>p.origin==='manual').map(p=>p.frame));expect(anchors.length).toBeGreaterThan(2);
 const middle=anchors[Math.floor(anchors.length/2)];await page.evaluate(f=>{__wormez.state.currentFrame=f;document.getElementById('scrubber').value=f;},middle);
 await page.locator('#runBtn').click();await page.waitForFunction(()=>!__wormez.state.running);
 const result=await page.evaluate(()=>({range:__wormez.state.lastVerificationRange,last:__wormez.state.track.at(-1),manual:__wormez.state.keyframes.filter(p=>p.origin==='manual').map(p=>p.frame)}));
 expect(result.range.start).toBe(anchors[anchors.indexOf(middle)-1]);expect(result.range.end).toBe(anchors[anchors.indexOf(middle)+1]);expect(result.range.end-result.range.start).toBeLessThan(59);expect(result.manual).toEqual(anchors);expect(result.last).toEqual(before);
});
