// End-to-end local-helper smoke test. Start Launch WormEZ.command first.
// This uses HTTP localhost because the optional helper is unavailable on file://.
const {chromium}=require('@playwright/test');
const path=require('path');const fs=require('fs');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto('http://127.0.0.1:8765/WormEZ.html');
    if(process.argv.includes('--baseline'))await page.route('**/tapir/status',route=>route.fulfill({status:503,body:'{}'}));
    const file=process.argv[2]||'samples/occlusion_worm.webm';
    await page.setInputFiles('#fileInput',path.resolve(file));
    await page.waitForFunction(()=>window.__wormez?.state.loaded&&!window.__wormez.state.running,undefined,{timeout:60000});
    for(let i=0;i<20&&await page.locator('#anchorReview').isVisible();i++)
      await page.locator('#acceptReviewAnchor').click();
    await page.waitForFunction(()=>window.__wormez.state.workflowPhase==='ready',undefined,{timeout:30000});
    await page.locator('#runBtn').click();
    await page.waitForFunction(()=>document.body.dataset.phase==='analyzing'&&!!document.querySelector('.working-dots'),undefined,{timeout:5000});
    const live=await page.evaluate(()=>{const el=document.querySelector('.workflow-status');return {text:el?.textContent,dots:!!el?.querySelector('.working-dots'),border:getComputedStyle(el).borderTopStyle};});
    await page.waitForFunction(()=>window.__wormez.state.workflowPhase==='results'||window.__wormez.state.workflowPhase==='error',undefined,{timeout:600000});
    const result=await page.evaluate(()=>{
      const s=window.__wormez.state;
      const hinted=s.track.filter(p=>p.modelHint),rows=window.__wormez.buildSeries()?.recs||[];
      return {phase:s.workflowPhase,frames:s.track.length,verified:s.track.filter(p=>p.status==='verified').length,
        uncertain:s.track.filter(p=>p.status==='uncertain').length,tapir:s.tapirStats,
        origins:[...new Set(s.track.map(p=>p.origin))],modelHints:hinted.length,
        unsafeModelAcceptance:hinted.some(p=>p.status!=='uncertain'),
        exportHintRows:rows.filter(row=>row.model_hint_x_px!=='').length,
        gaps:WormTracker.intervals(s.track).map(r=>({...r,reasons:[...new Set(s.track.filter(p=>p.frame>=r.start&&p.frame<=r.end).map(p=>p.reason))]}))};
    });
    const excelHasHintColumns=await page.evaluate(async()=>{
      const workbook=new ExcelJS.Workbook();
      await workbook.xlsx.load(await (await window.__wormez.buildXlsxBlob()).arrayBuffer());
      const headers=workbook.getWorksheet('Data').getRow(1).values;
      return headers.includes('model_hint_x_px')&&headers.includes('model_hint_y_px');
    });
    if(process.env.WORMEZ_TRACK_OUT){
      const evidence=await page.evaluate(()=>{
        const s=window.__wormez.state;
        return {bodyLength:s.larvaLen,points:s.track.filter(p=>p.frame>=210&&p.frame<=270).map(p=>({frame:p.frame,x:p.x,y:p.y,status:p.status,modelHint:p.modelHint,reason:p.reason}))};
      });
      fs.writeFileSync(process.env.WORMEZ_TRACK_OUT,JSON.stringify(evidence,null,2));
    }
    if(process.env.WORMEZ_EVIDENCE){
      const reviewFrame=result.gaps[0]?.start??Math.floor(result.frames/2);
      await page.locator('#scrubber').fill(String(reviewFrame));
      await page.waitForFunction(()=>!document.getElementById('videoEl').seeking);
      await page.locator('#canvasWrap').screenshot({path:process.env.WORMEZ_EVIDENCE});
    }
    console.log(JSON.stringify({file,live,result,excelHasHintColumns,errors},null,2));
    if(!live.dots||live.border!=='none'||!excelHasHintColumns||result.phase!=='results'||!result.frames||errors.length||result.unsafeModelAcceptance||result.exportHintRows!==result.modelHints)process.exitCode=1;
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
