import { test, expect } from '@playwright/test';
import { format, addDays, addMonths } from 'date-fns';
test('bulk pasted goals are grouped, deduplicated, persisted and visible in the agenda',async({page})=>{
  const tomorrow=addDays(new Date(),1),later=addMonths(tomorrow,1);
  await page.goto('/?app=bucket');await page.getByRole('button',{name:'Paste agendas',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Paste your agendas'});
  await dialog.getByLabel('Agendas to import').fill(`${format(tomorrow,'MMMM yyyy')} — Our little plans\n${format(tomorrow,'yyyy-MM-dd')} | A picnic for us | Date night\n${format(tomorrow,'yyyy-MM-dd')} | A picnic for us | Date night\n${format(later,'MMMM yyyy')}\n- Choose matching shirts\n${format(later,'yyyy-MM-dd')} | Coffee and a photobooth | Memories`);
  await expect(dialog.getByText('1 duplicate goal will be skipped.')).toBeVisible();
  await dialog.getByRole('button',{name:'Import 3 goals',exact:true}).click();await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'A picnic for us',exact:true})).toHaveCount(1);
  await expect(page.locator('.month-group-heading')).toHaveCount(2);
  await page.getByRole('button',{name:'Agenda',exact:true}).click();
  const agenda=page.locator('.agenda-popover');await expect(agenda.getByText('A picnic for us',{exact:true})).toBeVisible();
  await agenda.getByRole('button',{name:/A picnic for us/}).click();
  await expect(page.getByRole('dialog',{name:'Edit moment'})).toBeVisible();await page.getByLabel('Title',{exact:true}).fill('A picnic with Gio');await page.getByRole('button',{name:'Save moment',exact:true}).click();
  await page.getByRole('button',{name:'Close agenda widget'}).click();await page.reload();
  await expect(page.getByRole('heading',{name:'A picnic with Gio',exact:true})).toBeVisible();
});
test('journal month tabs, page flips and sticky notes preserve writing',async({page})=>{
  await page.goto('/?app=journal');await page.getByRole('button',{name:'New page',exact:true}).click();
  const title=page.getByLabel('Journal title',{exact:true});await title.fill('Our first page');await title.press('Tab');
  await page.getByLabel('Journal entry',{exact:true}).fill('The first page is full of little things.');
  await expect(page.getByText('Saved with love',{exact:true})).toBeVisible();
  const sticky=page.getByLabel('Journal sticky note');await sticky.fill('The way we laughed at lunch.');await sticky.press('Tab');
  await page.getByRole('button',{name:'New page',exact:true}).click();await expect(page.getByLabel('Journal title')).toHaveValue('A little moment');
  await page.getByLabel('Journal entry',{exact:true}).fill('A second page to remember.');
  await page.getByRole('button',{name:'Previous journal page'}).click();
  await expect(page.getByLabel('Journal title')).toHaveValue('Our first page');
  await expect(page.getByLabel('Journal sticky note')).toHaveValue('The way we laughed at lunch.');
  await expect(page.getByLabel('Journal entry',{exact:true})).toContainText('The first page is full of little things.');
  await page.getByRole('button',{name:'Next journal page'}).click();await expect(page.getByLabel('Journal entry',{exact:true})).toContainText('A second page to remember.');
  await page.getByRole('navigation',{name:'Journal months'}).getByRole('button').first().click();
  await expect(page.getByRole('navigation',{name:'Journal months'}).getByRole('button').first()).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.page-flip-overlay').last()).toHaveCSS('opacity','0');
  await page.screenshot({path:'/tmp/gio-journal-improved.png',fullPage:true});
});
test('photo names and notes can be edited, searched, downloaded and survive reload',async({page})=>{
  await page.goto('/?app=gallery');
  await page.getByLabel('Upload photograph').setInputFiles({name:'our-first-photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5foAAAAASUVORK5CYII=','base64')});
  await page.getByRole('button',{name:'Edit our-first-photo',exact:true}).click();const detail=page.getByRole('dialog',{name:'Edit memory'});
  await detail.getByLabel('Photo file name').fill('Our little picnic.png');await detail.getByLabel('Photo notes').fill('We stayed until the sky turned pink.');
  await detail.getByLabel('Album',{exact:true}).selectOption('Adventures');await detail.getByRole('button',{name:'Save changes'}).click();await expect(detail.getByText('Memory updated')).toBeVisible();
  const downloaded=page.waitForEvent('download');await detail.getByRole('button',{name:'Download photo'}).click();expect((await downloaded).suggestedFilename()).toBe('Our little picnic.png');
  await detail.getByRole('button',{name:'Close photo details'}).click();await page.reload();
  await expect(page.getByRole('heading',{name:'Our little picnic',exact:true})).toBeVisible();
  await page.getByLabel('Search photos').fill('sky turned pink');await expect(page.locator('.polaroid')).toHaveCount(1);
  await page.getByRole('button',{name:'Edit Our little picnic',exact:true}).click();await expect(page.getByLabel('Photo notes')).toHaveValue('We stayed until the sky turned pink.');
  await expect(page.locator('.photo-detail-backdrop')).toHaveCSS('opacity','1');
  await page.screenshot({path:'/tmp/gio-photo-improved.png',fullPage:true});
});
test('mobile can find every app and use the agenda and import review without overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.getByRole('button',{name:'Apps',exact:true}).click();await page.getByRole('button',{name:'Bucket List',exact:true}).click();
  await page.getByRole('button',{name:'Paste agendas'}).click();await page.getByRole('button',{name:'Try an example'}).click();
  await expect(page.getByRole('dialog',{name:'Paste your agendas'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button',{name:'Close bulk import'}).click();await page.getByRole('button',{name:'Agenda',exact:true}).click();
  await expect(page.getByRole('region',{name:'Calendar and agenda'}).last()).toBeVisible();
  await expect(page.locator('.agenda-popover')).toHaveCSS('opacity','1');
  await page.screenshot({path:'/tmp/gio-agenda-mobile.png',fullPage:true});
});

test('selecting a widget day creates a plan and opens that month in the full calendar',async({page})=>{
  const target=addDays(new Date(),1);
  await page.goto('/');const home=page.getByRole('region',{name:'Our Little Corner',exact:true});
  const widget=home.getByRole('region',{name:'Calendar and agenda'});
  await widget.getByRole('button',{name:format(target,'MMMM d, yyyy'),exact:true}).click();
  await widget.getByRole('button',{name:'Add a plan · '+format(target,'MMM d'),exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Tomorrow, just us');await page.getByRole('button',{name:'Save moment',exact:true}).click();
  await expect(widget.getByText('Tomorrow, just us',{exact:true})).toBeVisible();
  await widget.getByRole('button',{name:'Open full calendar',exact:true}).click();
  await expect(page.locator('.fc-toolbar-title')).toHaveText(format(target,'MMMM yyyy'));
  await expect(page.locator('.fc-event-title').filter({hasText:'Tomorrow, just us'})).toBeVisible();
});

test('a hanging bulk save times out, keeps the paste, and retries with the same IDs',async({page})=>{
  let storeUrl='';page.on('response',response=>{if(response.url().includes('/src/stores/data.ts'))storeUrl=response.url();});
  await page.clock.install();await page.goto('/?app=bucket');
  await expect(page.getByRole('button',{name:'Paste agendas',exact:true})).toBeVisible();
  await page.evaluate(async(storeUrl)=>{
    const {useData}=await import(storeUrl);
    const {withRequestDeadline}=await import('/src/lib/requestDeadline.ts');
    const save=useData.getState().saveMany;let attempts=0;let ids:string[]=[];
    useData.setState({mode:'cloud',saveMany:async(rows: import('../src/stores/data').Item[])=>{
      if(attempts++===0){ids=rows.map(row=>row.id);await withRequestDeadline(()=>new Promise(()=>{}));}
      else{(window as any).__sameImportIds=JSON.stringify(ids)===JSON.stringify(rows.map(row=>row.id));useData.setState({mode:'local'});await save(rows);}
    }});
  },storeUrl);
  await page.getByRole('button',{name:'Paste agendas',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Paste your agendas'});
  await dialog.getByLabel('Agendas to import').fill('A little weekend adventure');
  await dialog.getByRole('button',{name:'Import 1 goal',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Saving…',exact:true})).toBeDisabled();
  await page.clock.fastForward(16_000);
  await expect(dialog.getByRole('alert')).toContainText('Supabase did not respond within 15 seconds');
  await expect(dialog.getByLabel('Agendas to import')).toHaveValue('A little weekend adventure');
  await expect(page.getByRole('heading',{name:'A little weekend adventure',exact:true})).toHaveCount(0);
  await dialog.getByRole('button',{name:'Import 1 goal',exact:true}).click();
  await expect(dialog).toHaveCount(0);await expect(page.getByRole('heading',{name:'A little weekend adventure',exact:true})).toHaveCount(1);
  expect(await page.evaluate(()=>(window as any).__sameImportIds)).toBe(true);
});
