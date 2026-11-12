const {test,expect}=require('@playwright/test');test.setTimeout(90000);let server;test.beforeAll(async()=>server=await require('./static-server.cjs')());test.afterAll(async()=>server.close());
async function load(page){await page.goto(server.url);await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&!__wormez.state.preparing);}
test('player ordering, distinct tool groups and reset/re-analysis confirmations',async({page})=>{
 await load(page);for(let i=0;i<12&&await page.locator('#anchorReview').isVisible();i++)await page.locator('#acceptReviewAnchor').click();
 const order=await page.locator('.player-controls').evaluate(el=>[...el.children].map(n=>n.id||n.className));expect(order.indexOf('playerTime')).toBeLessThan(order.indexOf('prevBtn'));expect(order.indexOf('prevBtn')).toBeLessThan(order.indexOf('playBtn'));expect(order.indexOf('playBtn')).toBeLessThan(order.indexOf('nextBtn'));expect(await page.locator('.player-secondary #resetBtn').count()).toBe(1);
 await expect(page.getByRole('complementary',{name:'Video editing tools'})).toBeVisible();await expect(page.getByRole('complementary',{name:'View and anchor tools'})).toBeVisible();expect(await page.locator('.analysis-controls #undoBtn').count()).toBe(1);
 const anchors=await page.evaluate(()=>__wormez.state.keyframes.length);page.once('dialog',d=>d.dismiss());await page.locator('#resetBtn').click();expect(await page.evaluate(()=>__wormez.state.keyframes.length)).toBe(anchors);
 await page.locator('#runBtn').click();await page.waitForFunction(()=>!__wormez.state.running&&!!__wormez.state.analysisResult);const job=await page.evaluate(()=>__wormez.state.jobId);page.once('dialog',d=>d.dismiss());await page.locator('#runBtn').click();expect(await page.evaluate(()=>__wormez.state.jobId)).toBe(job);
 await page.screenshot({path:'/private/tmp/wormez-separated-tools.png'});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('video editing previews trim, split and crop without changing scientific data',async({page})=>{
 await load(page);await page.evaluate(()=>{__wormez.state.sourceFile.path='/test/source.mp4';window.wormezDesktop={editVideo:async(source,recipe)=>{window.lastVideoEdit={source,recipe};return{files:[]};}};});
 const before=await page.evaluate(()=>({clip:__wormez.state.clipId,anchors:JSON.stringify(__wormez.state.keyframes)}));await page.locator('[data-edit=trim]').click();const editor=page.getByRole('dialog',{name:'Prepare video'});await expect(editor).toBeVisible();
 await editor.getByRole('slider',{name:'Trim start frame',exact:true}).fill('5');await expect(editor.locator('[data-start]')).toHaveValue('5');await editor.locator('[data-end]').fill('49');await editor.locator('[data-end]').dispatchEvent('change');
 await editor.locator('[data-mode=split]').click();await editor.getByRole('slider',{name:'Edit preview frame'}).fill('25');await editor.getByRole('button',{name:'Split at this frame'}).click();await expect(editor.getByRole('button',{name:'Remove split at frame 25'})).toBeVisible();
 await editor.locator('[data-mode=crop]').click();const canvas=editor.locator('canvas');const b=await canvas.boundingBox();await page.mouse.move(b.x+b.width*.1,b.y+b.height*.1);await page.mouse.down();await page.mouse.move(b.x+b.width*.7,b.y+b.height*.7,{steps:5});await page.mouse.up();await expect(editor.locator('[data-crop-size]')).not.toHaveText('Full frame');
 await editor.getByRole('button',{name:'Save edited copies'}).click();await expect.poll(()=>page.evaluate(()=>window.lastVideoEdit?.recipe.end)).toBe(50);const edit=await page.evaluate(()=>window.lastVideoEdit);expect(edit.recipe.start).toBe(5);expect(edit.recipe.cuts).toEqual([25]);expect(edit.recipe.crop.width).toBeGreaterThan(10);expect(await page.evaluate(()=>({clip:__wormez.state.clipId,anchors:JSON.stringify(__wormez.state.keyframes)}))).toEqual(before);await page.keyboard.press('Escape');await expect(editor).not.toBeVisible();
});
test('equal vertical rails and centered bare play control keep all analysis actions on one line',async({page})=>{
 await load(page);await page.evaluate(()=>{for(const id of ['recoverGaps','connectGaps','reviewNextIssue']){const el=document.getElementById(id);el.hidden=false;el.style.setProperty('display','inline-flex','important');}});
 for(const width of [940,1280,1440,1920]){
  await page.setViewportSize({width,height:900});
  await expect.poll(()=>page.evaluate(()=>{const a=document.querySelector('.video-edit-tools').getBoundingClientRect(),b=document.querySelector('.video-view-tools').getBoundingClientRect(),v=document.getElementById('canvasWrap').getBoundingClientRect(),p=document.getElementById('playBtn').getBoundingClientRect();return Math.abs(a.width-b.width)<1&&a.right<=v.left+1&&b.left>=v.right-1&&Math.abs(p.left+p.width/2-v.left-v.width/2)<1;})).toBe(true);
  const row=await page.locator('.analysis-controls').evaluate(el=>({overflow:el.scrollWidth-el.clientWidth,ys:[...el.querySelectorAll('.btn')].map(b=>b.getBoundingClientRect()).filter(b=>b.width).map(b=>b.top)}));expect(Math.max(...row.ys)-Math.min(...row.ys)).toBeLessThan(1);expect(row.ys.length).toBe(7);expect(row.overflow).toBeLessThanOrEqual(1);
  expect(await page.locator('#anchorReview').evaluate(el=>el.getBoundingClientRect().width>=el.parentElement.clientWidth-3)).toBe(true);
  const play=await page.locator('#playBtn').evaluate(el=>{const s=getComputedStyle(el);return{background:s.backgroundColor,shadow:s.boxShadow,border:s.borderWidth};});expect(play.background).toBe('rgba(0, 0, 0, 0)');expect(play.shadow).toBe('none');expect(play.border).toBe('0px');
  expect(await page.locator('#resetBtn').evaluate(el=>el.querySelector('span').getBoundingClientRect().right<=el.getBoundingClientRect().right+1)).toBe(true);
  if(width===940||width===1440)await page.locator('.stage').screenshot({path:'/private/tmp/wormez-rails-'+width+'.png'});
 }
});
