const {test,expect}=require('@playwright/test');
const path=require('node:path');

test('desktop shell keeps video visible and saves appearance and alert preferences',async({page})=>{
  await page.setViewportSize({width:1000,height:800});
  await page.goto('file://'+path.resolve('WormEZ.html'));
  await expect(page.locator('.app-sidebar')).toBeVisible();
  await expect(page.locator('.app-bar')).toBeVisible();
  await expect(page.locator('.lqg-lens')).toHaveCount(1);
  const layout=await page.evaluate(()=>{const side=document.querySelector('.app-sidebar').getBoundingClientRect(),video=document.querySelector('#canvasWrap').getBoundingClientRect();return{sideRight:side.right,videoLeft:video.left,videoWidth:video.width}});
  expect(layout.videoLeft).toBeGreaterThanOrEqual(layout.sideRight);
  expect(layout.videoWidth).toBeGreaterThan(650);
  expect(await page.evaluate(()=>{const box=document.querySelector('#canvasWrap').getBoundingClientRect();return document.elementFromPoint(box.left+box.width/2,box.top+box.height/2)?.classList.contains('vitrio-scene')})).toBe(false);

  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Settings'})).toBeVisible();
  await page.getByRole('button',{name:'Dark',exact:true}).click();
  await page.getByRole('checkbox',{name:/Glass surfaces/}).uncheck();
  await expect(page.locator('.lqg-lens')).toHaveCount(0);
  await expect(page.locator('.vitrio-scene')).toHaveCount(0);
  await page.getByRole('button',{name:'Alerts',exact:true}).click();
  await page.getByRole('checkbox',{name:/Attention sound/}).uncheck();
  expect(await page.evaluate(()=>({theme:document.documentElement.dataset.theme,glass:document.documentElement.dataset.glass,sound:document.getElementById('soundAlerts').checked}))).toEqual({theme:'dark',glass:'off',sound:false});
  await page.reload();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('button',{name:'Dark',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('checkbox',{name:/Glass surfaces/})).not.toBeChecked();
  await page.getByRole('button',{name:'Alerts',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:/Attention sound/})).not.toBeChecked();
  await page.getByRole('button',{name:'Close settings'}).click();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('stage previews stay in the sidebar and close controls use local icons',async({page})=>{
  await page.setViewportSize({width:1100,height:800});
  await page.goto('file://'+path.resolve('WormEZ.html'));
  await expect(page.locator('.stage-list li')).toHaveCount(4);
  for(const [index,title] of ['Videos','Setup','Analyze','Results'].entries()){
    await page.locator('.stage-list li').nth(index).hover();
    await expect(page.locator('#stage-preview strong')).toHaveText(title);
    const bounds=await page.evaluate(()=>{const preview=document.querySelector('#stage-preview').getBoundingClientRect(),video=document.querySelector('#canvasWrap').getBoundingClientRect();return{previewRight:preview.right,videoLeft:video.left}});
    expect(bounds.previewRight).toBeLessThanOrEqual(bounds.videoLeft);
  }
  await page.getByRole('button',{name:'Setup',exact:true}).click();
  await expect(page.locator('#stage-preview')).toHaveCount(0);
  await expect(page.locator('.more-menu')).toHaveCount(0);
  await expect(page.locator('.sidebar-utilities button')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Collapse sidebar'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Diagnostics',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'How analysis works',exact:true})).toHaveCount(0);
  const brand=await page.evaluate(()=>{const side=document.querySelector('.app-sidebar').getBoundingClientRect(),mark=document.querySelector('.app-identity').getBoundingClientRect();return Math.abs((mark.left+mark.width/2)-(side.left+side.width/2));});
  expect(brand).toBeLessThan(2);
  await page.reload();await expect(page.locator('.app-identity')).toBeVisible();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('button',{name:'Close settings'}).locator('i.fa-times')).toBeVisible();
});

test('compact sidebar and opened preview stay readable without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('file://'+path.resolve('WormEZ.html'));
  await page.getByRole('button',{name:'Analyze',exact:true}).hover();
  await expect(page.locator('#stage-preview')).toBeVisible();
  await page.getByRole('button',{name:'Settings',exact:true}).hover();
  await page.getByRole('button',{name:'Settings',exact:true}).focus();
  await expect(page.locator('#stage-preview')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
  const bounds=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width);
});
