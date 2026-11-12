const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve('..');
const videoExt=/\.(mp4|mov|m4v|webm|avi|mkv|wmv|mts|m2ts|ts|mpg|mpeg|3gp)$/i;
const files=[...fs.readdirSync(root).filter(name=>videoExt.test(name)).map(name=>path.join(root,name)),
  ...fs.readdirSync(path.join(root,'Additional videos to analyze')).filter(name=>videoExt.test(name)).map(name=>path.join(root,'Additional videos to analyze',name)),
  ...fs.readdirSync(path.join(root,'WormEZ/samples')).filter(name=>videoExt.test(name)).map(name=>path.join(root,'WormEZ/samples',name))]
  .filter(file=>!process.env.WORMEZ_AUDIT_MATCH||file.includes(process.env.WORMEZ_AUDIT_MATCH));
const limit=Number(process.env.WORMEZ_AUDIT_MS||45000);
const skipMulti=process.env.WORMEZ_AUDIT_SKIP_MULTI==='1';
const output=path.resolve(skipMulti?'tests/video-audit-single-worm.json':'tests/video-audit-latest.json');

(async()=>{
  const browser=await chromium.launch();
  const results=[];
  try{
    for(const file of files){
      const page=await browser.newPage({viewport:{width:1200,height:850}});
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const started=Date.now();
      let issue=null;
      try{
        await page.goto('file://'+path.resolve('WormEZ.html'));
        if(skipMulti)await page.evaluate(()=>{window.WormMulti.assign=()=>[]});
        await page.setInputFiles('#fileInput',file);
        await page.waitForFunction(()=>{
          const s=window.__wormez?.state;
          return s&&['reviewing','reviewingBoundary','ready','error'].includes(s.workflowPhase);
        },null,{timeout:limit});
      }catch(error){issue=String(error.message).split('\n')[0]}
      let state=null;
      try{state=await page.evaluate(()=>{
        const s=window.__wormez?.state;
        return s&&{phase:s.workflowPhase,loaded:s.loaded,running:s.running,totalFrames:s.totalFrames,
          message:s.workflowMessage,status:document.getElementById('statusText')?.textContent,
          proposals:s.proposals?.map(p=>({frame:p.frame,x:p.x,y:p.y,boundary:p.boundary,status:p.status}))||[],
          worms:s.multi?.worms?.length||0,directDecoder:!!s.mediaIndex,decoder:s.decoderStats,errors:s.errors?.slice(-4)};
      })}catch(error){issue=issue||String(error.message).split('\n')[0]}
      const result={file:path.relative(root,file),seconds:Math.round((Date.now()-started)/1000),issue,errors,state};
      results.push(result);
      fs.writeFileSync(output,JSON.stringify(results,null,2));
      console.log(`${results.length}/${files.length} ${result.file}: ${state?.phase||'none'} · ${state?.status||issue||''} · ${state?.proposals.length||0} proposals`);
      await page.close();
    }
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
