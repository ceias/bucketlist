import {describe,it,expect} from 'vitest';
import {newWorld,move,interact,validWorld,WIDTH} from './model';
describe('little pixel world',()=>{
 it('conserves blocks through building and collecting and refuses distant changes',()=>{const w=newWorld();const placed=interact(w,3,2,'build','wood');expect(placed.world.inventory.wood).toBe(4);expect(move(placed.world,1,0).x).toBe(2);const mined=interact(placed.world,3,2,'mine','wood');expect(mined.world.inventory.wood).toBe(5);expect(move(mined.world,1,0).x).toBe(3);expect(interact(w,10,10,'build','wood').world).toBe(w)});
 it('collects each heart only once and prevents walking into water or off map',()=>{const w=newWorld();w.x=7;w.y=3;const found=move(w,1,0);expect(found.hearts).toBe(1);expect(found.tiles[3*WIDTH+8]).toBe('grass');expect(move(move(found,-1,0),1,0).hearts).toBe(1);w.x=13;expect(move(w,1,0).x).toBe(13);w.x=0;expect(move(w,-1,0).x).toBe(0)});
 it('rejects corrupt saves and empty inventory builds',()=>{const w=newWorld();expect(validWorld(JSON.parse(JSON.stringify(w)))).toBe(true);expect(validWorld({...w,x:NaN})).toBe(false);expect(validWorld({...w,tiles:[]})).toBe(false);w.inventory.wood=0;expect(interact(w,3,2,'build','wood').world).toBe(w)});
});
