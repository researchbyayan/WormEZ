const {test,expect}=require('@playwright/test');const path=require('node:path');
test.setTimeout(180000);
async function load(page){await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);for(let n=0;n<20&&await page.locator('#anchorReview').isVisible();n++)await page.locator('#acceptReviewAnchor').click();}
test('OpenCV finishes without invoking TAPIR and clears pending editing',async({page})=>{
 await load(page);await page.evaluate(()=>{window.modelCalls=0;window.wormezDesktop={tapirStatus:async()=>{modelCalls++;return{available:false}}};__wormez.state.pendingAnchor={frame:0,x:20,y:20};});
 await page.locator('#runBtn').click();await page.waitForFunction(()=>!__wormez.state.running);
 const r=await page.evaluate(()=>({calls:modelCalls,pending:__wormez.state.pendingAnchor,mode:__wormez.state.pointerMode,stats:__wormez.state.tapirStats,profile:__wormez.state.analysisProfile,coverage:__wormez.state.metrics.coverage}));
 expect(r.calls).toBe(0);expect(r.pending).toBe(null);expect(r.mode).toBe('navigate');expect(r.stats).toBe(null);expect(r.profile.frames).toBeGreaterThanOrEqual(120);expect(r.coverage).toBeGreaterThan(.8);
});
test('recovery and straight connections require separate clicks and do not alter verified totals',async({page})=>{
 await load(page);await page.locator('#runBtn').click();await page.waitForFunction(()=>!__wormez.state.running);
 await page.evaluate(()=>{const s=__wormez.state;const first=s.track[0],last=s.track.at(-1);s.keyframes=[{...first,origin:'manual',status:'manual'},{...last,origin:'manual',status:'manual'}];s.track=s.track.map((p,i)=>i&&i<s.track.length-1?{...p,status:'uncertain',anatomy:null}:p);s.tapirStats=null;window.modelCalls=0;window.wormezDesktop={tapirStatus:async()=>{modelCalls++;return{available:false}}};__wormez.recompute();});
 // Refresh action visibility through the canonical transport's workflow event.
 await page.evaluate(()=>__wormez.refreshReview());
 await expect(page.locator('#connectGaps')).toBeDisabled();expect(await page.evaluate(()=>__wormez.state.manualSegments.length)).toBe(0);
 await page.locator('#recoverGaps').click();await page.waitForFunction(()=>!__wormez.state.running);expect(await page.evaluate(()=>modelCalls)).toBe(1);
 const before=await page.evaluate(()=>({statuses:__wormez.state.track.map(p=>p.status),total:__wormez.state.metrics.verifiedDist}));
 await page.locator('#connectGaps').click();
 const after=await page.evaluate(()=>({statuses:__wormez.state.track.map(p=>p.status),total:__wormez.state.metrics.verifiedDist,segments:__wormez.state.manualSegments.length,cumulative:__wormez.buildSeries().recs.at(-1).cum_px}));
 expect(after.statuses).toEqual(before.statuses);expect(after.total).toBe(before.total);expect(after.segments).toBe(1);expect(after.cumulative).toBe(0);
});
test('explicit recovery can use the desktop bridge from a file page',async({page})=>{
 await load(page);await page.locator('#runBtn').click();await page.waitForFunction(()=>!__wormez.state.running);
 await page.evaluate(()=>{const s=__wormez.state;s.track=s.track.map(p=>p.frame>=20&&p.frame<=24?{...p,status:'uncertain'}:p);window.modelCalls=0;window.modelFrameCount=0;window.wormezDesktop={tapirStatus:async()=>({available:true}),tapirTrack:async body=>{modelCalls++;modelFrameCount=JSON.parse(body).frames.length;return{ok:true,result:{}}}};__wormez.recompute();__wormez.refreshReview();});
 await page.locator('#recoverGaps').click();await page.waitForFunction(()=>!__wormez.state.running);expect(await page.evaluate(()=>modelCalls)).toBe(1);expect(await page.evaluate(()=>modelFrameCount)).toBe(7);await expect(page.locator('#connectGaps')).toBeEnabled();
});
test('model waiting stays indeterminate and final counters describe the full clip',async({page})=>{
 await load(page);await page.locator('#runBtn').click();await page.waitForFunction(()=>!__wormez.state.running);
 await page.evaluate(()=>{const s=__wormez.state;s.track=s.track.map(p=>p.frame>=20&&p.frame<=24?{...p,status:'uncertain'}:p);window.wormezDesktop={tapirStatus:async()=>({available:true}),tapirTrack:async()=>{window.modelWaiting=true;return new Promise(resolve=>window.releaseModel=resolve)}};__wormez.recompute();__wormez.refreshReview();});
 await page.locator('#recoverGaps').click();await page.waitForFunction(()=>window.modelWaiting);await expect(page.locator('#curtainStage')).toHaveText('Motion model gap search');await expect(page.locator('#analysisDetail')).not.toContainText('TAPIR');await page.evaluate(()=>{__wormez.job.expectedUnits=7;__wormez.job.processed=7;document.getElementById('pointsCount').textContent='7';});await page.locator('#pauseBtn').click();await page.locator('#pauseBtn').click();await expect(page.locator('#curtainBar')).not.toHaveAttribute('value');await expect(page.locator('#analysisEta')).toContainText('local model');
 await page.evaluate(()=>window.releaseModel({ok:true,result:{}}));await page.waitForFunction(()=>!__wormez.state.running);const count=await page.evaluate(()=>__wormez.state.track.length);await expect(page.locator('#pointsCount')).toHaveText(String(count));await expect(page.locator('#trackerState')).toContainText('% accepted');
});
