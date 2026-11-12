const {test,expect}=require('@playwright/test'),path=require('node:path');test.setTimeout(180000);
test('L6 rim reflection is not suggested as a final boundary, and the real larva can be placed',async({page})=>{
 await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput',path.resolve('../03-05-2026 da Gal4 x w1118 L6.MP4'));await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&!__wormez.state.preparing);
 expect(await page.evaluate(()=>__wormez.state.boundaryFrames.end)).toBeNull();expect(await page.evaluate(()=>__wormez.state.proposals.some(p=>p.frame===__wormez.state.totalFrames-1))).toBe(false);
 for(let n=0;n<20&&await page.locator('#anchorReview').isVisible();n++)await page.locator('#acceptReviewAnchor').click();
 await page.waitForFunction(()=>__wormez.state.workflowPhase==='reviewingBoundary'&&!document.getElementById('videoEl').seeking);await expect(page.locator('#runBtn')).toBeDisabled();
 const aim=await page.locator('#overlayCanvas').evaluate(c=>{const r=c.getBoundingClientRect(),scale=Math.min(r.width/c.width,r.height/c.height);return{x:r.x+(r.width-c.width*scale)/2+463*scale,y:r.y+(r.height-c.height*scale)/2+90*scale}});await page.mouse.click(aim.x,aim.y);await page.locator('#pointerConfirm').click();await page.waitForFunction(()=>__wormez.state.workflowPhase==='ready');await expect(page.locator('#runBtn')).toBeEnabled();const end=await page.evaluate(()=>__wormez.state.keyframes.at(-1));expect(Math.hypot(end.x-463,end.y-90)).toBeLessThan(2);
});
