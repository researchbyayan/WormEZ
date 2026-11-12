const {chromium}=require('@playwright/test'),path=require('path'),fs=require('fs');
(async()=>{const browser=await chromium.launch();try{for(const file of process.argv.slice(2)){
 const page=await browser.newPage();await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput',file);
 await page.waitForFunction(()=>__wormez.state.loaded&&(__wormez.state.seeded||!__wormez.state.running));
 if(await page.evaluate(()=>__wormez.state.seeded)){
  await page.locator('#runBtn').click();await page.evaluate(()=>{__wormez.state.totalFrames=Math.min(180,__wormez.state.totalFrames);__wormez.runVerification();});
  await page.waitForFunction(()=>!__wormez.state.running,{},{timeout:300000});
 }
 console.log(path.basename(file),await page.evaluate(()=>({status:document.getElementById('statusText').textContent,coverage:__wormez.state.metrics?.coverage,stats:__wormez.state.verificationStats,tracks:__wormez.state.discoveryTracks?.map(t=>({...t,seed:{x:t.seed.x,y:t.seed.y,length:t.seed.length}})),reasons:__wormez.state.track.reduce((a,p)=>(a[p.reason]=(a[p.reason]||0)+1,a),{})})));
 await page.screenshot({path:'/tmp/probe-'+path.basename(file)+'.png'});await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
