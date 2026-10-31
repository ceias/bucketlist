import { test, expect } from '@playwright/test';

test('notes and bulk imports work with the crypto APIs available on HTTP LAN origins',async({page})=>{
  // Reproduce the missing secure-context API through localhost, the cloud runner's permitted local test route.
  await page.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{configurable:true,value:undefined}));
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?app=bucket');
  expect(await page.evaluate(()=>typeof crypto.randomUUID)).toBe('undefined');
  await page.getByRole('button',{name:'Paste agendas',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Paste your agendas'});
  await dialog.getByLabel('Agendas to import').fill('November 2026\n- A network picnic\n- Matching shirts');
  await dialog.getByRole('button',{name:'Import 2 goals',exact:true}).click();await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'A network picnic',exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'Application dock'}).getByRole('button',{name:'Notes',exact:true}).click();
  await page.getByRole('button',{name:'New note',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Saved over the network');
  await page.getByRole('button',{name:'Save note',exact:true}).click();await expect(page.getByRole('heading',{name:'Saved over the network',exact:true})).toBeVisible();
  const ids=await page.evaluate(()=>JSON.parse(localStorage.getItem('gio-me-data')!).state.items.map((item:{id:string})=>item.id));
  expect(ids).toHaveLength(3);expect(ids.every((id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))).toBe(true);
  expect(errors).toEqual([]);
});

test('an ID preparation failure releases the import spinner and preserves the paste',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(crypto,'randomUUID',{configurable:true,value:undefined});
    Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:()=>{throw Error('Secure ID generation is unavailable');}});
  });
  await page.goto('/?app=bucket');await page.getByRole('button',{name:'Paste agendas',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Paste your agendas'});
  await dialog.getByLabel('Agendas to import').fill('Keep my little plans');
  await dialog.getByRole('button',{name:'Import 1 goal',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Secure ID generation is unavailable');
  await expect(dialog.getByRole('button',{name:'Import 1 goal',exact:true})).toBeEnabled();
  await expect(dialog.getByLabel('Agendas to import')).toHaveValue('Keep my little plans');
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);
});
