import { test, expect } from '@playwright/test';
import { mockSharedAccount, inviteCode } from './auth-fixture';
import { PARTNER_WELCOME_TITLE, PARTNER_WELCOME_MESSAGE } from '../src/auth/copy';

test('login comes first and welcomes Gio with the requested message before the desktop',async({page})=>{
  await mockSharedAccount(page,{member:true});await page.goto('/');
  await expect(page.getByRole('heading',{name:'Hello again, sweetheart.',exact:true})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Application dock'})).toHaveCount(0);
  await expect(page.locator('.love-login-window')).toHaveCSS('opacity','1');
  await page.screenshot({path:'/tmp/gio-love-login.png',fullPage:true});
  await page.getByLabel('Email address',{exact:true}).fill('gio@example.com');await page.getByLabel('Password',{exact:true}).fill('test-password');
  await page.getByRole('button',{name:'Let me in, with love',exact:true}).click();
  await expect(page.getByRole('heading',{name:PARTNER_WELCOME_TITLE,exact:true})).toBeVisible();
  await expect(page.locator('.welcome-love-message')).toHaveText(PARTNER_WELCOME_MESSAGE);
  await expect(page.locator('.love-welcome-card')).toHaveCSS('opacity','1');
  await page.screenshot({path:'/tmp/gio-personal-welcome.png',fullPage:true});
  await page.getByRole('button',{name:'Enter our little world',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Application dock'})).toBeVisible();
  await expect(page.getByText('FOR GIO, WITH LOVE',{exact:true})).toBeVisible();
});
test('invitation links show a partner request and require explicit acceptance after login',async({page})=>{
  await page.setViewportSize({width:390,height:844});await mockSharedAccount(page);await page.goto('/?invite='+inviteCode);
  await expect(page.getByRole('heading',{name:'Gio, you’re invited.',exact:true})).toBeVisible();
  await expect(page.getByText('Brisias saved you a place in Our Little Corner.',{exact:true})).toBeVisible();
  await page.getByLabel('Email address',{exact:true}).fill('gio@example.com');await page.getByLabel('Password',{exact:true}).fill('test-password');
  await page.getByRole('button',{name:'Let me in, with love',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).__loveTest.accepted)).toBe(0);
  await page.screenshot({path:'/tmp/gio-partner-invite-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Accept with love',exact:true}).click();
  await expect(page.getByRole('heading',{name:PARTNER_WELCOME_TITLE,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).__loveTest.accepted)).toBe(1);
  expect(await page.evaluate(()=>localStorage.getItem('gio-me-pending-invite'))).toBe(null);
  expect(page.url()).not.toContain('invite=');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});
test('expired invitation links cannot be accepted',async({page})=>{
  await mockSharedAccount(page,{expired:true});await page.goto('/?invite='+inviteCode);
  await expect(page.getByRole('alert')).toContainText('expired');
  await expect(page.getByRole('button',{name:'Accept with love',exact:true})).toHaveCount(0);
});
test('partner notices retain unread history, receive a live summary and can be marked read',async({page})=>{
  await mockSharedAccount(page,{signedIn:true,member:true});await page.goto('/');
  await page.getByRole('button',{name:'Enter our little world',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Application dock'})).toBeVisible();
  await page.evaluate(()=>{const notice={id:'notice-one',workspace_id:'our-workspace',recipient_id:'gio-user',actor_id:'brisias-user',actor_name:'Brisias',title:'Brisias added 5 new agendas',message:'A little more to look forward to, together.',app_kind:'bucket',record_id:null,item_count:5,created_at:new Date().toISOString(),read_at:null};(window as any).__loveTest.sendNotice(notice)});
  await expect(page.getByRole('status').getByText('Brisias added 5 new agendas',{exact:true})).toBeVisible();
  await expect(page.locator('.notification-count')).toHaveText('1');
  await page.getByRole('button',{name:'Notification center',exact:true}).click();
  const panel=page.getByRole('complementary',{name:'Partner notifications'});
  await expect(panel.getByText('Brisias added 5 new agendas',{exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'Mark all read',exact:true}).click();await expect(page.locator('.notification-count')).toHaveCount(0);
  await page.getByRole('button',{name:'Dismiss partner update',exact:true}).click();
  await page.evaluate(()=>{(window as any).__loveTest.sendNotice({id:'notice-own',workspace_id:'our-workspace',recipient_id:'gio-user',actor_id:'gio-user',title:'Own event',message:'Should not alert myself',app_kind:'bucket',created_at:new Date().toISOString(),read_at:null})});
  await expect(page.getByText('Should not alert myself',{exact:true})).toHaveCount(0);
});
test('an existing member can create an invitation link without visiting app settings',async({page})=>{
  await mockSharedAccount(page,{signedIn:true,member:true});await page.goto('/?invitePartner=1');
  await expect(page.getByRole('heading',{name:'Send a little invitation',exact:true})).toBeVisible();
  await expect(page.getByLabel('Your partner’s name')).toHaveValue('Gio');
  await expect(page.getByLabel('A message waiting just for them')).toHaveValue(PARTNER_WELCOME_MESSAGE);
  await page.getByRole('button',{name:'Create partner invitation link',exact:true}).click();
  await expect(page.getByLabel('Private invitation link',{exact:true})).toHaveValue('http://127.0.0.1:5173/?invite='+inviteCode);
});

test('opening an invitation from an existing workspace asks for the partner account',async({page})=>{
  await mockSharedAccount(page,{signedIn:true,member:true});await page.goto('/?invite='+inviteCode);
  await expect(page.getByText('You’re already in a private workspace.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Accept with love',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Use another account',exact:true}).click();
  await expect(page.getByLabel('Email address',{exact:true})).toBeVisible();
});

test('email opt-in belongs to the signed-in account and can be turned off',async({page})=>{
  await mockSharedAccount(page,{signedIn:true,member:true});await page.goto('/');
  await page.getByRole('button',{name:'Enter our little world',exact:true}).click();
  await page.getByRole('button',{name:'Notification center',exact:true}).click();
  const email=page.getByRole('region',{name:'Email notifications'});
  await expect(email.getByText('gio@example.com',{exact:true})).toBeVisible();
  await email.getByRole('button',{name:'Enable email alerts',exact:true}).click();
  await expect(email.getByRole('status')).toHaveText('Your email preference is saved.');
  await expect(email.getByText('Email delivery isn’t connected yet.',{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).__loveTest.emailEnabled)).toBe(true);
  await email.getByRole('button',{name:'Turn off email alerts',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).__loveTest.emailEnabled)).toBe(false);
});
