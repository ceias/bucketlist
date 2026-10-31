import { test, expect } from '@playwright/test';
test('desktop windows, notes persistence, trash restoration and calendar event',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Our little corner of the world.'})).toBeVisible();
 await page.getByRole('button',{name:'Maximize Our Little Corner',exact:true}).click();
 await expect(page.getByRole('region',{name:'Our Little Corner',exact:true})).toHaveCSS('opacity','1');
 await page.screenshot({path:'/tmp/gio-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Notes',exact:true}).click();
 await page.getByRole('button',{name:'New note',exact:true}).click();
 await page.getByLabel('Title',{exact:true}).fill('Remember our picnic');
 await page.getByLabel('Notes',{exact:true}).fill('Bring the little blanket.');
 await page.getByRole('button',{name:'Save note',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Remember our picnic'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Remember our picnic'})).toBeVisible();
 await page.getByRole('button',{name:'Delete Remember our picnic'}).click();
 await expect(page.getByRole('heading',{name:'Remember our picnic'})).toHaveCount(0);
 await page.getByRole('button',{name:'Trash',exact:true}).click();await page.getByRole('button',{name:'Restore',exact:true}).click();
 await page.getByRole('button',{name:'Notes',exact:true}).click();await expect(page.getByRole('heading',{name:'Remember our picnic'})).toBeVisible();
 await page.getByRole('button',{name:'Calendar',exact:true}).click();await page.getByRole('button',{name:'Add event',exact:true}).click();
 await page.getByLabel('Title',{exact:true}).fill('An afternoon together');await page.getByLabel('Date',{exact:true}).fill('2026-11-15');
 await page.getByRole('button',{name:'Save moment'}).click();await expect(page.getByRole('heading',{name:'Make a new memory'})).toHaveCount(0);
 expect(errors).toEqual([]);
});
test('mobile launcher and responsive full-screen notes',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:'Our little OS',exact:true}).click();
 await page.getByRole('button',{name:'Notes',exact:true}).click();await expect(page.getByRole('heading',{name:'Little Notes'})).toBeVisible();
 const box=await page.getByRole('region',{name:'Little Notes',exact:true}).boundingBox();expect(box!.width).toBeLessThanOrEqual(390);
 await expect(page.getByRole('region',{name:'Little Notes',exact:true})).toHaveCSS('opacity','1');
 await page.screenshot({path:'/tmp/gio-mobile.png',fullPage:true});
});

test('journal autosave and finance calculations use saved records',async({page})=>{
 await page.goto('/');await page.getByRole('navigation',{name:'Application dock'}).getByRole('button',{name:'Journal',exact:true}).click();
 await page.getByRole('button',{name:'New page',exact:true}).click();
 await page.locator('[aria-label="Journal entry"]').fill('Today we found our favorite little corner.');
 await expect(page.getByText('Saved with love',{exact:true})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:/A little moment/}).click();
 await expect(page.locator('[aria-label="Journal entry"]')).toContainText('Today we found our favorite little corner.');
 await page.getByRole('button',{name:'Finances',exact:true}).click();
 await page.getByRole('button',{name:'Add transaction',exact:true}).click();
 await page.getByLabel('Title',{exact:true}).fill('Gio’s date fund');
 await page.getByLabel('Category',{exact:true}).fill('Savings');
 await page.getByLabel('Amount (₱)',{exact:true}).fill('300');
 await page.getByRole('button',{name:'Save moment',exact:true}).click();
 await expect(page.locator('.finance-stats .green b')).toHaveText('₱300');
});

test('windows drag, resize, minimize, restore and close',async({page})=>{
 await page.goto('/');const win=page.getByRole('region',{name:'Our Little Corner',exact:true});await expect(win).toHaveCSS('opacity','1');
 const before=(await win.boundingBox())!;const title=win.locator('.window-titlebar');const titleBox=(await title.boundingBox())!;
 await page.mouse.move(titleBox.x+180,titleBox.y+15);await page.mouse.down();await page.mouse.move(titleBox.x+240,titleBox.y+40,{steps:6});await page.mouse.up();
 await expect.poll(async()=>Math.round((await win.boundingBox())!.x)).toBe(Math.round(before.x+60));
 const grip=win.getByRole('button',{name:'Resize window'});const box=(await grip.boundingBox())!;const old=(await win.boundingBox())!;
 await page.mouse.move(box.x+5,box.y+5);await page.mouse.down();await page.mouse.move(box.x+35,box.y+25,{steps:4});await page.mouse.up();
 await expect.poll(async()=>Math.round((await win.boundingBox())!.width)).toBe(Math.round(old.width+30));
 await win.getByRole('button',{name:'Minimize Our Little Corner'}).click();await expect(win).toHaveCount(0);
 await page.getByRole('button',{name:'Switch to Our Little Corner'}).click();await expect(win).toBeVisible();
 await win.getByRole('button',{name:'Maximize Our Little Corner'}).click();await expect(win).toHaveClass(/maximized/);
 await win.getByRole('button',{name:'Maximize Our Little Corner'}).click();await expect(win).not.toHaveClass(/maximized/);
 await win.getByRole('button',{name:'Close Our Little Corner'}).click();await expect(win).toHaveCount(0);
});
