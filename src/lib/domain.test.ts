import { describe, it, expect } from 'vitest';
import { nextAnniversary } from '../apps/Home';
import { clampPosition } from '../stores/windows';
import { missionSeeds } from '../data/missions';
describe('anniversary dates',()=>{
 it('uses February 13, 2027 as the first anniversary',()=>expect(nextAnniversary(new Date(2026,9,31))).toEqual(new Date(2027,1,13)));
 it('keeps the current anniversary on the day and advances afterward',()=>{expect(nextAnniversary(new Date(2027,1,13,18))).toEqual(new Date(2027,1,13));expect(nextAnniversary(new Date(2027,1,14))).toEqual(new Date(2028,1,13))});
});
describe('desktop boundaries',()=>{it('keeps restored windows inside the desktop',()=>{expect(clampPosition(-50,-30,1200,800,880,620)).toEqual({x:0,y:0});expect(clampPosition(900,700,1200,800,880,620)).toEqual({x:320,y:180})})});
describe('monthly starter plan',()=>{it('covers all twelve months without duplicate goals',()=>{expect(new Set(missionSeeds.map(i=>i.date)).size).toBe(12);expect(new Set(missionSeeds.map(i=>i.date+i.title)).size).toBe(missionSeeds.length);expect(missionSeeds.every(i=>!i.done&&i.amount===0)).toBe(true)})});
