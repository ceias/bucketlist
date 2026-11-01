import {test,expect} from '@playwright/test';
const themes=['midnight','macintosh','aero','finder','graphite'];
for(const theme of themes){
 test(`${theme} persists and keeps desktop controls reachable`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?app=settings');
  await page.locator(`.theme-swatch.${theme}`).click();
  await expect(page.locator('.os')).toHaveClass(new RegExp(`theme-${theme}`));
  await page.reload();await expect(page.locator('.os')).toHaveClass(new RegExp(`theme-${theme}`));
  await page.getByRole('button',{name:'Show desktop',exact:true}).click();
  await expect(page.getByRole('button',{name:'Open our comfort jar game',exact:true})).toBeVisible();
  await page.screenshot({path:`/tmp/theme-${theme}.png`});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:'Show desktop',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(['finder','graphite'].includes(theme)){
   const dock=page.getByRole('navigation',{name:'Pinned applications'});await expect(dock).toBeInViewport();
   await page.getByRole('button',{name:'Launch Calendar from dock',exact:true}).click();
   await expect(page.getByRole('region',{name:'Our Calendar',exact:true})).toBeVisible();
  }
  expect(errors).toEqual([]);
 });
}
