const {chromium}=require('@playwright/test');
const path=require('path');
(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.goto('file://'+path.resolve('WormEZ.html'));
    await page.setInputFiles('#fileInput','samples/clean_worm.webm');
    await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running);
    await page.screenshot({path:'/tmp/wormez-ui-review.png',fullPage:true});
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
