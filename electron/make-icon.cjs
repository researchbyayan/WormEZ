const { chromium } = require('@playwright/test');
const path = require('path');
(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1024,height:1024},deviceScaleFactor:1});
    await page.goto('file://'+path.resolve(__dirname,'icon.svg'));
    await page.screenshot({path:path.resolve(__dirname,'icon-1024.png'),omitBackground:true});
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
