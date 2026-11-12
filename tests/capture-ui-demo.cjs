const {chromium}=require('@playwright/test');
const fs=require('fs');
const path=require('path');

const output=process.argv[2]||'/tmp/WormEZ UI Demo';
const app='file://'+path.resolve('WormEZ.html');
const demo=path.resolve('samples/clean_worm.webm');

async function shot(page,name,fullPage=false){
  await page.screenshot({path:path.join(output,name),fullPage});
}

(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    await page.goto(app);
    await page.evaluate(async()=>{await __wormez.runtime()});
    await shot(page,'01-empty-workspace.png');

    await page.setInputFiles('#fileInput',demo);
    await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&__wormez.state.proposals.length>0,{}, {timeout:120000});
    await page.locator('#anchorReview').waitFor({state:'visible'});
    await shot(page,'02-anchor-review.png');

    await page.locator('#adjustReviewAnchor').click();
    await page.locator('#pointerDock').waitFor({state:'visible'});
    await page.locator('#overlayCanvas').hover();
    await shot(page,'03-fix-anchor-mode.png');

    const proposal=await page.evaluate(()=>__wormez.state.proposals[__wormez.state.proposalReviewIndex]);
    const point=await page.locator('#overlayCanvas').evaluate((canvas,p)=>{
      const r=canvas.getBoundingClientRect();
      const s=Math.min(r.width/canvas.width,r.height/canvas.height);
      return{x:r.x+(r.width-canvas.width*s)/2+p.x*s,y:r.y+(r.height-canvas.height*s)/2+p.y*s};
    },proposal);
    await page.mouse.click(point.x,point.y);
    await shot(page,'04-pending-anchor-save-cancel.png');
    await page.locator('#pointerConfirm').click();

    for(let guard=0;guard<20&&await page.locator('#anchorReview').isVisible();guard++){
      await page.locator('#acceptReviewAnchor').click();
    }
    await page.waitForFunction(()=>__wormez.state.workflowPhase==='ready');
    await shot(page,'05-ready-to-analyze.png');

    await page.locator('#runBtn').click();
    await page.locator('#analysisCurtain').waitFor({state:'visible'});
    await shot(page,'06-analysis-progress.png');
    await page.locator('#viewProcessing').click();
    await shot(page,'07-analysis-video-visible.png');
    await page.waitForFunction(()=>!__wormez.state.running,{}, {timeout:120000});
    await page.locator('#viewMode').selectOption('path');
    await page.locator('#analysisResults').scrollIntoViewIfNeeded();
    await shot(page,'08-results-workspace.png',true);

    await page.setViewportSize({width:390,height:844});
    await page.locator('#canvasWrap').scrollIntoViewIfNeeded();
    await shot(page,'09-compact-results.png',true);
    console.log(`Saved ${fs.readdirSync(output).filter(f=>f.endsWith('.png')).length} screenshots to ${output}`);
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
