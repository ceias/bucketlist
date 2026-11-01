import {test,expect} from '@playwright/test';
test('Gio can build, collect, walk and resume the saved world',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?app=pixelworld');
 const game=page.getByRole('region',{name:'Gio’s Little World',exact:true});await expect(game).toBeVisible();
 await game.getByRole('button',{name:'▦ Build',exact:true}).click();await game.getByRole('button',{name:'Build ahead',exact:true}).click();
 await expect(game.getByRole('button',{name:'wood at 4, 3',exact:true})).toBeVisible();
 await game.getByRole('button',{name:'Walk right',exact:true}).click();await expect(game.getByRole('button',{name:'Gio on grass at 3, 3',exact:true})).toBeVisible();
 await game.getByRole('button',{name:'⛏ Collect',exact:true}).click();await game.getByRole('button',{name:'Collect ahead',exact:true}).click();await game.getByRole('button',{name:'Walk right',exact:true}).click();
 await expect(game.getByRole('button',{name:'Gio on grass at 4, 3',exact:true})).toBeVisible();await page.reload();
 await expect(game.getByRole('button',{name:'Gio on grass at 4, 3',exact:true})).toBeVisible();
 await page.screenshot({path:'/tmp/gio-pixel-world.png'});
 await game.getByRole('button',{name:'New world',exact:true}).click();await game.getByRole('button',{name:'Keep my world',exact:true}).click();await expect(game.getByRole('button',{name:'Gio on grass at 4, 3',exact:true})).toBeVisible();
 const board=game.getByRole('group',{name:/Pixel world. Arrow keys/});await board.focus();await page.keyboard.press('ArrowLeft');await expect(game.getByRole('button',{name:'Gio on grass at 3, 3',exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('phone game and Smiski guide remain reachable with reduced motion',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?app=desktop');
 const guide=page.getByRole('button',{name:/Smiski guide —/});await guide.click();await expect(page.locator('.smiski-wave-arm').first()).toHaveCSS('animation-name','none');
 await page.getByRole('button',{name:'Play Gio’s Little World',exact:true}).click();await expect(page.getByRole('region',{name:'Gio’s Little World',exact:true})).toBeVisible();
 const board=await page.locator('.world-board').boundingBox();expect(board!.x).toBeGreaterThanOrEqual(0);expect(board!.x+board!.width).toBeLessThanOrEqual(390);
 await expect(page.getByRole('button',{name:'Walk right',exact:true})).toBeInViewport();await page.getByRole('button',{name:'Walk right',exact:true}).click();await expect(page.getByRole('button',{name:'Gio on grass at 4, 3',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/tmp/gio-pixel-world-phone.png'});
});
test('Smiski cycles through sticker poses inside the companion frame',async({page})=>{
 await page.clock.install();await page.goto('/?app=desktop');
 const art=page.locator('.cat-drag-handle .smiski-art');await expect(art).toHaveClass(/pose-read/);
 await page.clock.runFor(6500);await expect(art).toHaveClass(/pose-wave/);
 await page.clock.runFor(6500);await expect(art).toHaveClass(/pose-rest/);
 const frame=(await art.boundingBox())!,body=(await art.locator('.smiski-body').boundingBox())!;
 expect(body.y+body.height).toBeLessThanOrEqual(frame.y+frame.height+5);
 await page.screenshot({path:'/tmp/gio-smiski-rest.png'});
 await page.clock.runFor(6500);await expect(art).toHaveClass(/pose-carry/);
});
