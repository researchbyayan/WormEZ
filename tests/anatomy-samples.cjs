// Diagnostic images only: a single-frame silhouette is not two-pass verification.
const {chromium}=require('@playwright/test'),path=require('path'),fs=require('fs');
(async()=>{const browser=await chromium.launch();try{for(const file of process.argv.slice(2)){
 const page=await browser.newPage();await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput',file);
 await page.waitForFunction(()=>__wormez.state.headProposal||(__wormez.state.loaded&&!__wormez.state.running),{},{timeout:30000});
 if(!await page.evaluate(()=>!!__wormez.state.headProposal))throw Error('No initial head review for '+file);
 await page.locator('#headPane').screenshot({path:'/tmp/wormez-head-review-'+path.basename(file)+'.png'});await page.locator('#runBtn').click();
 const result=await page.evaluate(async()=>{
  const s=__wormez.state,v=document.getElementById('videoEl');v.currentTime=.5/s.fps;await new Promise(resolve=>v.addEventListener('seeked',resolve,{once:true}));
  const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');ctx.drawImage(v,0,0);
  const {cv}=await __wormez.runtime(),mat=cv.matFromImageData(ctx.getImageData(0,0,c.width,c.height));let candidate;
  try{candidate=WormTracker.choose(WormTracker.candidates(cv,mat,null,null),s.seedPos,s.larvaLen*2);}finally{mat.delete();}
  if(!candidate)return{error:'No unique first-frame candidate'};
  const a=WormAnatomy.geometry(candidate.outline),out=document.createElement('canvas');out.width=800;out.height=400;const x=out.getContext('2d'),span=candidate.length*1.6,left=candidate.x-span/2,top=candidate.y-span/2;
  for(let n=0;n<2;n++)x.drawImage(c,left,top,span,span,n*400,0,400,400);
  if(a){x.save();x.translate(400,0);x.scale(400/span,400/span);x.translate(-left,-top);for(const pts of[a.outline.concat(a.outline[0]),a.line]){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.strokeStyle='#00cbe3';x.lineWidth=span/200;x.stroke();}x.restore();}
  return{image:out.toDataURL('image/png').split(',')[1],outline:!!a,length:a?.length};
 });
 if(result.image)fs.writeFileSync('/tmp/wormez-outline-'+path.basename(file)+'.png',Buffer.from(result.image,'base64'));
 console.log(path.basename(file),{outline:result.outline,length:result.length,error:result.error});await page.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
