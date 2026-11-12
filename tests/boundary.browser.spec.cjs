const {test,expect}=require('@playwright/test');const path=require('node:path');test.setTimeout(120000);
test('white border renders from one source contour at different zoom levels',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&!__wormez.state.preparing);
 await page.evaluate(()=>{window.__featherRadii=[];const original=CanvasRenderingContext2D.prototype.stroke;CanvasRenderingContext2D.prototype.stroke=function(...args){if(this.canvas.id==='overlayCanvas'&&this.shadowBlur>0)window.__featherRadii.push(this.shadowBlur/(this.canvas.width/this.canvas.getBoundingClientRect().width));return original.apply(this,args)}});
 const before=await page.evaluate(()=>JSON.stringify(__wormez.state.proposals.map(p=>p.anatomy?.outline)));
 for(const zoom of ['1','2','4']){await page.locator('#zoomLevel').fill(zoom);await page.waitForTimeout(100);await page.locator('#canvasWrap').screenshot({path:`tests/area-results-validation/border-${zoom}x.png`});}
 expect(await page.evaluate(()=>JSON.stringify(__wormez.state.proposals.map(p=>p.anatomy?.outline)))).toBe(before);const radii=await page.evaluate(()=>window.__featherRadii);expect(radii.length).toBeGreaterThan(0);expect(radii.every(r=>Math.abs(r-1.5)<.01)).toBe(true);expect(errors).toEqual([]);
});
