import { describe,it,expect } from 'vitest';
import { catchAt,clampGuide,clawSlots,comforts } from './model';
describe('comfort arcade and desktop guide',()=>{
 it('catches the aligned cat and leaves gaps as gentle near misses',()=>{clawSlots.forEach((slot,i)=>expect(catchAt(slot)).toBe(i));expect(catchAt(135)).toBeNull();expect(catchAt(555)).toBe(4)});
 it('keeps the guide reachable after dragging or resizing',()=>{expect(clampGuide(-100,-100,390,700)).toEqual({x:8,y:8});expect(clampGuide(1000,1000,390,700)).toEqual({x:296,y:604});expect(clampGuide(100,100,40,40)).toEqual({x:8,y:8})});
 it('has a distinct, kind prize for every claw slot',()=>{expect(comforts).toHaveLength(clawSlots.length);expect(new Set(comforts.map(p=>p.id)).size).toBe(5);expect(comforts.every(p=>p.message&&p.action)).toBe(true)});
});
