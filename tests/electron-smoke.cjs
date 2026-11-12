const {_electron}=require('playwright');
const path=require('path'),fs=require('fs'),os=require('os');

(async()=>{
  const packaged=process.env.WORMEZ_PACKAGED==='1';
  const executablePath=packaged?path.resolve('dist-electron/mac/WormEZ.app/Contents/MacOS/WormEZ'):path.resolve('electron/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'wormez-smoke-'));
  const app=await _electron.launch({executablePath,args:packaged?[]:[path.resolve('electron'),'--user-data-dir='+profile],env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});
  try{
    const page=await app.firstWindow();
    const errors=[];page.on('pageerror',error=>errors.push(error.stack||error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
    await page.reload({waitUntil:'domcontentloaded'});
    try{await page.waitForSelector('.app-bar',{timeout:10000});}catch(error){console.error(JSON.stringify({url:page.url(),title:await page.title(),errors,root:await page.locator('#wormezReactShell').count(),scripts:await page.locator('script').evaluateAll(nodes=>nodes.map(node=>node.src||'inline'))},null,2));throw error;}
    const state=await page.evaluate(()=>({title:document.title,build:WORMEZ_BUILD,bridge:window.wormezDesktop?.build,phase:__wormez.state.workflowPhase,steps:document.querySelectorAll('.stage-list li').length,glass:document.documentElement.dataset.glass,status:document.querySelector('.workflow-status')?.textContent}));
    await page.screenshot({path:'test-results/electron-workspace-base.png',fullPage:true});
    await page.getByRole('button',{name:'Settings',exact:true}).click();
    await page.getByRole('dialog',{name:'Settings'}).waitFor();
    const settings=await page.evaluate(()=>({appearance:!!document.querySelector('.settings-options'),glassSwitch:!!document.querySelector('.settings-modal input[type=checkbox]')}));
    await page.screenshot({path:'test-results/electron-workspace.png',fullPage:true});
    if(state.title!=='WormEZ'||state.steps!==4||!['on','off'].includes(state.glass)||!state.bridge||state.bridge!==state.build||state.status?.includes('Launch WormEZ.command')||!settings.appearance||!settings.glassSwitch||errors.length)throw new Error(JSON.stringify({state,settings,errors}));
    console.log(JSON.stringify({...state,packaged}));
  }finally{await Promise.race([app.close(),new Promise(resolve=>setTimeout(resolve,3000))]);fs.rmSync(profile,{recursive:true,force:true});}
  process.exit(0);
})().catch(error=>{console.error(error);process.exitCode=1;});
