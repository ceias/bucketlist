import { test, expect } from '@playwright/test';
async function openTrash(page: import('@playwright/test').Page) {
  await page.addInitScript(()=>localStorage.setItem('gio-me-data',JSON.stringify({version:1,state:{mode:'local',items:[{id:'trashed-note',kind:'notes',title:'Our little picnic plan',body:'Bring the blanket.',date:'2026-11-01',category:'Together',amount:0,done:false,private:false,data:{},deleted:true}]}})));
  await page.goto('/?app=trash');
  await expect(page.getByRole('heading',{name:'Our little picnic plan',exact:true})).toBeVisible();
}
test('styled delete dialog defaults to cancel, supports Escape, and deletes only after confirmation',async({page})=>{
  let nativeDialogs=0;page.on('dialog',async dialog=>{nativeDialogs++;await dialog.dismiss();});
  await openTrash(page);
  const trigger=page.getByRole('button',{name:'Permanently delete Our little picnic plan',exact:true});
  await trigger.click();const dialog=page.getByRole('dialog',{name:'Delete permanently?',exact:true});
  await expect(dialog.getByText('Our little picnic plan',{exact:true})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
  await trigger.click();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(trigger).toBeVisible();
  await trigger.click();await expect(page.locator('.delete-confirmation')).toHaveCSS('opacity','1');await page.screenshot({path:'/tmp/gio-delete-dialog.png',fullPage:true});
  await dialog.getByRole('button',{name:'Delete permanently',exact:true}).click();await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Our little picnic plan',exact:true})).toHaveCount(0);await expect(page.getByText('All tidy here.',{exact:true})).toBeVisible();
  expect(nativeDialogs).toBe(0);
});
test('a failed deletion keeps the item and confirmation open for retry on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  let storeUrl='';page.on('response',response=>{if(response.url().includes('/src/stores/data.ts'))storeUrl=response.url();});
  await openTrash(page);
  await page.evaluate(async url=>{
    const {useData}=await import(url);const original=useData.getState().purge;let failed=false;
    useData.setState({purge:async(id:string)=>{if(!failed){failed=true;throw Error('Could not reach Supabase. Please try again.');}await original(id);}});
  },storeUrl);
  await page.getByRole('button',{name:'Permanently delete Our little picnic plan',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Delete permanently?',exact:true});
  await dialog.getByRole('button',{name:'Delete permanently',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not reach Supabase');
  await expect(page.getByRole('heading',{name:'Our little picnic plan',exact:true})).toHaveCount(1);
  await expect(dialog.getByRole('button',{name:'Delete permanently',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await dialog.getByRole('button',{name:'Delete permanently',exact:true}).click();await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Our little picnic plan',exact:true})).toHaveCount(0);
});
