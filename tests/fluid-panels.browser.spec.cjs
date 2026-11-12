const {test,expect}=require('@playwright/test'),path=require('node:path');test.setTimeout(180000);
test('compact inspectors follow content height without holes or overlapping cards',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&!__wormez.state.preparing);await page.evaluate(()=>{__wormez.state.workflowPhase='results';__wormez.refreshReview();});
 for(const width of [940,1024,1199,1440,390]){
  await page.setViewportSize({width,height:1000});await page.locator('#scalePreset').selectOption('custom');
  await expect.poll(async()=>page.evaluate(()=>{const host=document.querySelector('.workspace>.controls'),cards=[...host.children].filter(c=>c.getClientRects().length).map(c=>{const r=c.getBoundingClientRect();return{id:c.id||c.tagName,x:r.x,y:r.y,w:r.width,h:r.height};});let overlap=false,hole=false;for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){const a=cards[i],b=cards[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>2&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>2)overlap=true;}const w=host.getBoundingClientRect().width;const narrow=cards.filter(c=>c.w<w*.8);for(const c of narrow){const next=narrow.filter(d=>Math.abs(c.x-d.x)<2&&d.y>c.y).sort((a,b)=>a.y-b.y)[0];if(next&&next.y-c.y-c.h>25)hole=true;}return{overlap,hole};})).toEqual({overlap:false,hole:false});
  await page.locator('#scalePane').scrollIntoViewIfNeeded();await page.screenshot({path:`tests/new-features-validation/fluid-panels-${width}.png`});
 }
 expect(errors).toEqual([]);
});
