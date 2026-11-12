const {test,expect}=require('@playwright/test');const path=require('node:path');
test('facts appear after idle, type progressively, and dismiss without closing Settings',async({page})=>{
  await page.clock.install();await page.goto('file://'+path.resolve('WormEZ.html'));
  await expect(page.locator('.app-sidebar')).toBeVisible();
  await page.clock.fastForward(61000);
  await expect(page.getByRole('dialog',{name:'Biology facts screensaver'})).toHaveCount(0);
  await page.clock.fastForward(60000);
  const saver=page.getByRole('dialog',{name:'Biology facts screensaver'});
  await expect(saver).toBeVisible();await expect(saver).toHaveAttribute('data-fact-count','50');
  await page.clock.fastForward(1000);expect((await page.locator('.screensaver-copy p').textContent()).length).toBeGreaterThan(0);
  await page.keyboard.press('Escape');await expect(saver).toHaveCount(0);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Preview',exact:true}).click();await expect(saver).toBeVisible();
  await saver.click();await expect(saver).toHaveCount(0);await expect(page.getByRole('dialog',{name:'Settings',exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:'Science facts screensaver',exact:true}).uncheck();
  await page.getByRole('button',{name:'Close settings'}).click();await page.clock.fastForward(121000);await expect(saver).toHaveCount(0);
  expect(await page.locator('body').innerText()).not.toContain('\u2014');
});
test('reduced motion shows the entire fact immediately',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('file://'+path.resolve('WormEZ.html'));
  await expect(page.locator('.app-sidebar')).toBeVisible();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Preview',exact:true}).click();
  await expect(page.locator('.screensaver-copy p')).toHaveText(await page.locator('.screensaver-copy .sr-only').textContent());
  await page.keyboard.press('Escape');await expect(page.locator('.biology-screensaver')).toHaveCount(0);await expect(page.getByRole('dialog',{name:'Settings',exact:true})).toBeVisible();
});
test('typing runs at 75 percent speed, holds an extra second, and source link does not dismiss',async({page})=>{
 await page.clock.install();await page.goto('file://'+path.resolve('WormEZ.html'));await expect(page.locator('.app-sidebar')).toBeVisible();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+10000)));await page.evaluate(()=>window.dispatchEvent(new Event('wormez:preview-screensaver')));
 const text=await page.locator('.screensaver-copy .sr-only').textContent();await page.clock.runFor(320);const typed=await page.locator('.screensaver-copy p').textContent();expect(typed.length).toBeGreaterThanOrEqual(6);expect(typed.length).toBeLessThanOrEqual(8);await expect(page.locator('.screensaver-source')).toHaveCount(0);
 await page.clock.runFor(Math.ceil(text.length*32/.75));await expect(page.locator('.screensaver-source')).toBeVisible();await page.locator('.biology-screensaver').screenshot({path:'tests/screensaver-reviewed-preview.png'});const url=await page.locator('.screensaver-source').getAttribute('href');expect(url.startsWith('https://')).toBe(true);
 await page.clock.fastForward(10500);await expect(page.locator('.screensaver-copy .sr-only')).toHaveText(text);await page.clock.fastForward(1000);expect(await page.locator('.screensaver-copy .sr-only').textContent()).not.toBe(text);
 const nextText=await page.locator('.screensaver-copy .sr-only').textContent();await page.clock.runFor(Math.ceil(nextText.length*32/.75)+100);await page.locator('.screensaver-source').evaluate(a=>a.addEventListener('click',e=>e.preventDefault()));await page.locator('.screensaver-source').click();await expect(page.locator('.biology-screensaver')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.biology-screensaver')).toHaveCount(0);
});
