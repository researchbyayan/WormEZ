const {test,expect}=require('@playwright/test'),path=require('node:path');test.setTimeout(120000);
test('video draws the smoothed stroke without raw red dots, retains gaps and never edits measured points',async({page})=>{
 await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&!__wormez.state.preparing);
 const result=await page.evaluate(()=>{
  const s=__wormez.state;s.track=Array.from({length:30},(_,frame)=>({frame,x:70+frame*2,y:90+(frame%2?1:-1),status:frame===15?'uncertain':'verified',origin:'auto'}));s.keyframes=[];s.proposals=[];s.seedPos=null;s.showHCT=false;s.showOutline=false;s.manualFallbackEnabled=false;s.workflowPhase='results';s.larvaLen=20;__wormez.recompute();const before=JSON.stringify(s.track),metrics=JSON.stringify(s.metrics),ctx=document.getElementById('overlayCanvas').getContext('2d');let rawDots=0,segments=0;
  const fill=ctx.fill,move=ctx.moveTo;ctx.fill=function(...args){if(this.fillStyle==='#df3030')rawDots++;return fill.apply(this,args)};ctx.moveTo=function(...args){if(this.strokeStyle==='rgba(201, 74, 58, 0.85)')segments++;return move.apply(this,args)};
  const slider=document.getElementById('zoomLevel');slider.value=4;slider.dispatchEvent(new Event('input'));
  return{rawDots,segments,unchanged:before===JSON.stringify(s.track),sameMetrics:metrics===JSON.stringify(s.metrics)};
 });
 expect(result.rawDots).toBe(0);expect(result.segments).toBe(2);expect(result.unchanged).toBe(true);expect(result.sameMetrics).toBe(true);
});
