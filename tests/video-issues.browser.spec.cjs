const {test,expect}=require('@playwright/test'),path=require('node:path');test.setTimeout(120000);
test('issues appear inside the video, avoid the larva, and dismiss in desktop and compact layouts',async({page})=>{
 await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>{const s=__wormez.state;s.lastPos={x:20,y:175};s.proposals=[];s.track=[];document.getElementById('fitFrame').click();window.dispatchEvent(new ErrorEvent('error',{error:new Error('Automatic identification is ambiguous. Place and save anchors on the first and last visible frames, then press Start analysis.')}));});
  const issue=page.locator('#errorPanel');await expect(issue).toBeVisible();await expect(page.locator('#canvasWrap #errorPanel')).toHaveCount(1);await expect(page.locator('#errorList')).toContainText('Automatic identification is ambiguous');
  await expect.poll(async()=>page.evaluate(()=>{const p=errorPanel.getBoundingClientRect(),w=canvasWrap.getBoundingClientRect(),s=__wormez.state,v=s.viewRect,x=w.left+(s.lastPos.x-v.x)/v.w*w.width,y=w.top+(s.lastPos.y-v.y)/v.h*w.height;return{inside:p.left>=w.left-1&&p.right<=w.right+1&&p.top>=w.top-1&&p.bottom<=w.bottom+1,clear:!(x>p.left&&x<p.right&&y>p.top&&y<p.bottom)};})).toEqual({inside:true,clear:true});
  await page.locator('#errorSummaryText').click();await expect(issue).not.toHaveAttribute('open','');await expect(page.getByRole('button',{name:'Dismiss issues',exact:true})).toBeVisible();await page.locator('#errorSummaryText').click();await expect(page.locator('#errorList')).toBeVisible();
  expect(await issue.evaluate(el=>el.scrollHeight<=el.clientHeight+2)).toBe(true);await page.screenshot({path:`test-results/video-issue-${width}.png`});await page.getByRole('button',{name:'Dismiss issues',exact:true}).click();await expect(issue).toBeHidden();
 }
 await page.evaluate(()=>window.dispatchEvent(new ErrorEvent('error',{error:new Error('Test issue')})));await page.locator('#errorSummary').focus();await page.keyboard.press('Escape');await expect(page.locator('#errorPanel')).toBeHidden();
 await page.evaluate(()=>window.dispatchEvent(new Event('wormez:preview-screensaver')));await expect(page.getByRole('dialog',{name:'Biology facts screensaver'})).toBeVisible();await page.evaluate(()=>window.dispatchEvent(new ErrorEvent('error',{error:new Error('Input is needed')})));await expect(page.getByRole('dialog',{name:'Biology facts screensaver'})).toBeHidden();await expect(page.locator('#errorPanel')).toBeVisible();
});
test('an unreadable clip reports its issue on the video workspace',async({page})=>{
 await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput',{name:'broken.mp4',mimeType:'video/mp4',buffer:Buffer.from('invalid video')});await expect(page.locator('#canvasWrap #errorPanel')).toBeVisible();await expect(page.locator('#errorList')).toContainText('Cannot decode');await expect(page.locator('#analysisCurtain')).toBeHidden();
});

test('misplaced errors return to the video with sentence-case messages',async({page})=>{
 await page.goto('file://'+path.resolve('WormEZ.html'));await page.waitForFunction(()=>!!window.__wormez);
 await page.evaluate(()=>{document.querySelector('.stage').appendChild(errorPanel);window.dispatchEvent(new ErrorEvent('error',{error:new Error('Camera movement: center motion cannot be isolated')}));});
 await expect(page.locator('#canvasWrap > #errorPanel')).toBeVisible();
 await expect(page.locator('#errorSummaryText')).toHaveText('1 issue needs attention');
 await expect(page.locator('#errorList')).toContainText("Camera movement prevents reliable tracking of the larva's center.");
 expect(await page.locator('#errorSummary').evaluate(el=>getComputedStyle(el).textTransform)).toBe('none');
 await page.getByRole('button',{name:'Dismiss issues',exact:true}).click();
 await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&!__wormez.state.preparing);await page.evaluate(()=>{__wormez.state.workflowPhase='results';__wormez.state.track=[{frame:0,x:80,y:100,status:'uncertain',reason:'Motion and appearance checks disagree'}];__wormez.refreshReview();});
 await expect(page.locator('#reviewList')).not.toContainText('Motion and appearance checks disagree');
 await page.getByRole('button',{name:'Review frames 0–0',exact:true}).click();
 await expect(page.locator('#canvasWrap #errorList')).toContainText("Motion and appearance checks do not agree. Review the larva's position in this frame.");
});
