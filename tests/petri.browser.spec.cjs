const {test,expect}=require('@playwright/test');
const path=require('node:path');
test.setTimeout(120000);
test('a jagged detected edge produces a smooth circular rim',async({page})=>{
  await page.goto('file://'+path.resolve('WormEZ.html'));
  const ellipse=await page.evaluate(async()=>{
    const {cv}=await __wormez.runtime(),canvas=document.createElement('canvas');canvas.width=400;canvas.height=300;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#111';ctx.fillRect(0,0,400,300);ctx.fillStyle='#ddd';ctx.beginPath();
    for(let i=0;i<360;i++){const t=i*Math.PI/180,r=80+2*Math.sin(17*t),x=200+r*Math.cos(t),y=150+r*Math.sin(t);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
    ctx.closePath();ctx.fill();
    return WormPetri.fit(cv,ctx.getImageData(0,0,400,300),{x:118,y:68,width:164,height:164});
  });
  expect(ellipse).not.toBe(null);expect(Math.abs(ellipse.x-200)).toBeLessThan(2);expect(Math.abs(ellipse.y-150)).toBeLessThan(2);
  expect(Math.abs(ellipse.width-160)).toBeLessThan(5);expect(Math.abs(ellipse.height-160)).toBeLessThan(5);
});
test('dish calibration requires a confirmed rim and known measurement; missing models stay uncalibrated',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('WormEZ.html'));
  await page.setInputFiles('#fileInput','samples/clean_worm.webm');
  await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
  await page.locator('#scalePreset').selectOption('petri');
  await page.evaluate(()=>{window.wormezDesktop={petriStatus:async()=>({available:false,reason:'Petri dish model not installed'})}});
  await page.locator('#detectDish').click();
  await expect(page.locator('#canvasWrap #errorList')).toContainText('Petri dish model not installed');
  expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBe(null);
  await page.evaluate(()=>{window.wormezDesktop={petriStatus:async()=>({available:true}),petriDetect:async()=>({boxes:[{ellipse:{x:160,y:100,width:140,height:140,angle:0}}]})}});
  await page.locator('#detectDish').click();
  await expect(page.locator('#confirmDish')).toBeVisible();
  const greenPixels=await page.locator('#overlayCanvas').evaluate(canvas=>{const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(Math.abs(d[i]-46)<5&&Math.abs(d[i+1]-158)<5&&Math.abs(d[i+2]-91)<5&&d[i+3]>100)n++;return n;});
  expect(greenPixels).toBeGreaterThan(100);
  expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBe(null);
  await page.locator('#confirmDish').click();
  await expect(page.locator('#scaleNote')).toContainText('Rim confirmed');
  await expect(page.locator('#confirmDish')).toBeHidden();
  expect(await page.evaluate(()=>({picking:__wormez.state.scalePicking,dots:__wormez.state.scaleDraft.length,ratio:__wormez.state.mmPerPixel}))).toEqual({picking:false,dots:0,ratio:null});
  await page.locator('#scaleValue').fill('100');await page.locator('#scaleValue').blur();
  expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBeCloseTo(100/140,8);
  await page.locator('#scalePreset').selectOption('custom');
  await expect(page.locator('#selectReferenceArea')).toBeVisible();
  expect(await page.evaluate(()=>__wormez.state.mmPerPixel)).toBe(null);
  expect(errors).toEqual([]);
});
test('compact manual rim selection brings the video into view',async({page})=>{
 await page.setViewportSize({width:940,height:1000});await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&!__wormez.state.preparing);await page.locator('#scalePreset').selectOption('petri');await page.locator('#markScale').click();const r=await page.locator('#overlayCanvas').boundingBox();expect(r.y).toBeGreaterThanOrEqual(0);expect(r.y+r.height).toBeLessThanOrEqual(1000);const s=await page.locator('#overlayCanvas').evaluate(c=>{const r=c.getBoundingClientRect(),scale=Math.min(r.width/c.width,r.height/c.height);return{x:r.x+(r.width-c.width*scale)/2,y:r.y+(r.height-c.height*scale)/2,scale,w:c.width,h:c.height}}),radius=Math.min(s.w,s.h)/4;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;await page.mouse.click(s.x+(s.w/2+radius*Math.cos(a))*s.scale,s.y+(s.h/2+radius*Math.sin(a))*s.scale);}await expect(page.locator('#confirmDish')).toBeVisible();await page.locator('#confirmDish').click();await expect(page.locator('#undoRimPoint')).toBeHidden();await expect(page.locator('#confirmDish')).toBeHidden();expect(await page.evaluate(()=>({picking:__wormez.state.scalePicking,points:__wormez.state.scaleConfig.points.length,draft:__wormez.state.scaleDraft.length,rim:!!__wormez.state.scaleConfig.ellipse}))).toEqual({picking:false,points:0,draft:0,rim:true});
});
