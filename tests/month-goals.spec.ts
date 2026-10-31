import { test, expect } from '@playwright/test';
import { addMonths, format } from 'date-fns';

test('month headings stay flexible while an explicit first-day date remains scheduled',async({page})=>{
  const target=addMonths(new Date(),1),month=format(target,'yyyy-MM'),label=format(target,'MMMM yyyy');
  await page.goto('/?app=bucket');await page.getByRole('button',{name:'Paste agendas',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Paste your agendas'});
  await dialog.getByLabel('Agendas to import').fill(`${label}\n- Buy matching clothes this month\n${month}-01 | An explicitly dated lunch`);
  await expect(dialog.getByText('Any day in '+format(target,'MMMM')+' · Monthly goals')).toBeVisible();
  await dialog.getByRole('button',{name:'Import 2 goals',exact:true}).click();
  await expect(page.getByText(label+' · any day',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Agenda',exact:true}).click();const widget=page.locator('.agenda-popover');
  await widget.getByRole('button',{name:'Next widget month',exact:true}).click();
  await widget.getByRole('button',{name:format(new Date(month+'-01T12:00:00'),'MMMM d, yyyy')+', 1 agenda items',exact:true}).click();
  await expect(widget.getByText('An explicitly dated lunch',{exact:true})).toBeVisible();
  await expect(widget.getByText('Buy matching clothes this month',{exact:true})).toHaveCount(0);
  await widget.getByRole('button',{name:format(target,'MMM')+' goals',exact:true}).click();
  await expect(widget.getByText('Buy matching clothes this month',{exact:true})).toBeVisible();
  await expect(widget.getByText('An explicitly dated lunch',{exact:true})).toHaveCount(0);
  await expect(widget.locator('.agenda-date-chip')).not.toContainText('1');
  await widget.getByRole('button',{name:'Open full calendar',exact:true}).click();
  await expect(page.locator('.calendar-month-goals').getByRole('button',{name:'Buy matching clothes this month',exact:true})).toBeVisible();
  await expect(page.locator('.fc-event-title').filter({hasText:'Buy matching clothes this month'})).toHaveCount(0);
  await expect(page.locator('.fc-event-title').filter({hasText:'An explicitly dated lunch'})).toBeVisible();
});

test('old imports can be corrected selectively without changing intentionally dated goals',async({page})=>{
  await page.addInitScript(()=>{
    const base={kind:'bucket',body:'',date:'2026-11-01',category:'Monthly goals',amount:0,done:false,private:false,data:{showOnCalendar:true}};
    if(!localStorage.getItem('gio-me-data'))localStorage.setItem('gio-me-data',JSON.stringify({version:1,state:{mode:'local',items:[{...base,id:'one',title:'An old monthly plan'},{...base,id:'two',title:'A deliberately scheduled first-day date'}]}}));
  });
  await page.goto('/?app=bucket');await page.getByRole('button',{name:'Correct month-only dates',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Correct month-only goals'});
  await expect(dialog.getByRole('button',{name:'Make 0 month-only',exact:true})).toBeDisabled();
  await dialog.getByLabel('An old monthly plan',{exact:true}).check();await dialog.getByRole('button',{name:'Make 1 month-only',exact:true}).click();
  await expect(dialog).toHaveCount(0);await expect(page.getByText('November 2026 · any day',{exact:true})).toHaveCount(1);
  await expect(page.getByText('Nov 1, 2026',{exact:true})).toHaveCount(1);
  await page.reload();await expect(page.getByText('November 2026 · any day',{exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Edit An old monthly plan',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Edit moment'}).getByLabel('Goal month',{exact:true})).toHaveValue('2026-11');
  await page.getByRole('button',{name:'Specific day',exact:true}).click();await page.getByLabel('Date',{exact:true}).fill('2026-11-13');
  await page.getByRole('button',{name:'Save moment',exact:true}).click();await expect(page.getByText('Nov 13, 2026',{exact:true})).toBeVisible();
});
