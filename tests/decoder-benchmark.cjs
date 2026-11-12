const {chromium}=require('@playwright/test');
const path=require('path');
const fs=require('fs');

(async()=>{
  const clips=process.argv.slice(2),sampleFrames=Number(process.env.WORMEZ_BENCH_FRAMES||180);
  const browser=await chromium.launch(),results=[];
  try{
    for(const clip of clips){
      const page=await browser.newPage();
      await page.goto('file://'+path.resolve('WormEZ.html'));
      await page.setInputFiles('#fileInput',clip);
      await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running,{},{timeout:180000});
      const result=await page.evaluate(async sampleFrames=>{
        const s=__wormez.state,v=document.getElementById('videoEl'),n=Math.min(sampleFrames,s.totalFrames),job=new WormTracker.Job();
        const measure=async fn=>{const started=performance.now();const detail=await fn();return{seconds:(performance.now()-started)/1000,...detail};};
        const sequential=await measure(async()=>{
          const reader=new WormFrameReader(v.src,s.fps,s.duration,v.videoWidth,v.videoHeight);
          try{for(let f=0;f<n;f++)await reader.read(f,job);for(let f=n-1;f>=0;f--)await reader.read(f,job);return{decoder:reader.stats};}finally{reader.dispose();}
        });
        const concurrent=await measure(async()=>{
          const forward=new WormMP4.Reader(s.mediaIndex,s.fps,s.duration,v.videoWidth,v.videoHeight),backward=new WormMP4.Reader(s.mediaIndex,s.fps,s.duration,v.videoWidth,v.videoHeight);
          try{await Promise.all([(async()=>{for(let f=0;f<n;f++)await forward.read(f,job);})(),(async()=>{for(let f=n-1;f>=0;f--)await backward.read(f,job);})()]);return{decoders:[forward.stats,backward.stats]};}finally{forward.dispose();backward.dispose();}
        });
        return{framesPerPass:n,sequential,concurrent,speedup:sequential.seconds/concurrent.seconds};
      },sampleFrames);
      result.file=path.basename(clip);results.push(result);console.log(result);await page.close();
    }
  }finally{await browser.close();}
  fs.writeFileSync('tests/decoder-benchmark.json',JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
