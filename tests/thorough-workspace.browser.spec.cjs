const {test,expect}=require('@playwright/test'),path=require('node:path');test.setTimeout(120000);
async function load(page,file='samples/clean_worm.webm'){await page.setInputFiles('#fileInput',file);await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&!__wormez.state.preparing)}
test('empty workspace hides irrelevant controls and restores them after loading',async({page})=>{
 await page.goto('file://'+path.resolve('WormEZ.html'));await expect(page.locator('.app-sidebar')).toBeVisible();for(const id of ['pointerDock','zoomLevel','runBtn','scalePane'])await expect(page.locator('#'+id)).toBeHidden();await expect(page.locator('#emptyState')).toContainText('Load Video');
 await load(page);await expect(page.locator('#pointerDock')).toBeVisible();await expect(page.locator('#zoomLevel')).toBeVisible();await expect(page.locator('#scalePane')).toBeVisible();
});
test('Settings traps keyboard focus and cannot undo workspace edits behind the dialog',async({page})=>{
 await page.goto('file://'+path.resolve('WormEZ.html'));await load(page);await page.locator('#scalePreset').selectOption('petri');const before=await page.evaluate(()=>__wormez.state.scaleConfig.preset);await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('button',{name:'Close settings'})).toBeFocused();
 await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!document.activeElement.closest('[role=dialog]'))).toBe(true);await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Close settings'})).toBeFocused();await page.keyboard.press('Control+z');expect(await page.evaluate(()=>__wormez.state.scaleConfig.preset)).toBe(before);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Settings'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused();
});
test('completed results retain custom calibration and manual landmark seeds on reopening',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve('WormEZ.html'));await load(page);for(let i=0;i<20&&await page.locator('#anchorReview').isVisible();i++)await page.locator('#acceptReviewAnchor').click();await page.locator('#runBtn').click();await page.waitForFunction(()=>!__wormez.state.running&&__wormez.state.track.length>1);
 const before=await page.evaluate(()=>{const s=__wormez.state;s.scaleConfig={preset:'custom',value:25,unit:'mm',measure:'area',points:[],frame:0,mask:{width:320,height:200,areaPixels:100,bits:WormSelection.pack(new Uint8Array(64000).fill(1,0,100))}};s.mmPerPixel=.5;s.headSeeds=[{frame:0,x:80,y:100,kind:'head',origin:'manual'}];__wormez.recompute();return{count:s.track.length,area:document.getElementById('areaEstimate').textContent}});
 await page.waitForTimeout(400);await page.reload();await load(page);await expect(page.locator('#statusText')).toContainText('Saved results restored');expect(await page.evaluate(()=>({ratio:__wormez.state.mmPerPixel,unit:__wormez.state.scaleConfig.unit,value:__wormez.state.scaleConfig.value,seeds:__wormez.state.headSeeds.length,count:__wormez.state.track.length}))).toEqual({ratio:.5,unit:'mm',value:25,seeds:1,count:before.count});await expect(page.locator('#scaleNote')).toContainText('Calibrated');await expect(page.locator('#areaEstimate')).toContainText('mm²');expect(errors).toEqual([]);
});
test('missing boundary opens the exact endpoint and a saved manual point completes review',async({page})=>{
 await page.goto('file://'+path.resolve('WormEZ.html'));await load(page);
 await page.evaluate(()=>{const s=__wormez.state;s.proposals=s.proposals.filter(p=>p.frame!==s.totalFrames-1);s.boundaryFrames.end=null;});
 for(let n=0;n<20&&await page.locator('#anchorReview').isVisible();n++)await page.locator('#acceptReviewAnchor').click();
 await page.waitForFunction(()=>__wormez.state.workflowPhase==='reviewingBoundary'&&!document.getElementById('videoEl').seeking);
 expect(await page.evaluate(()=>__wormez.state.currentFrame)).toBe(await page.evaluate(()=>__wormez.state.totalFrames-1));await expect(page.locator('#runBtn')).toBeDisabled();
 const target=await page.locator('#overlayCanvas').evaluate(c=>{const r=c.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});await page.mouse.click(target.x,target.y);await expect(page.locator('#pointerConfirm')).toBeEnabled();await page.locator('#pointerConfirm').click();
 await page.waitForFunction(()=>__wormez.state.workflowPhase==='ready');await expect(page.locator('#runBtn')).toBeEnabled();expect(await page.evaluate(()=>__wormez.state.pointerMode)).toBe('navigate');
});
