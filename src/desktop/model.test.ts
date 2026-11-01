import { describe,it,expect } from 'vitest';
import { catchAt,clampGuide,clawSlots,comforts,comfortHour,hourlyComfort,nextComfortRefresh } from './model';
describe('comfort arcade and desktop guide',()=>{
 it('rotates all five messages at the next clock hour, keeping them stable within the hour',()=>{const before=Date.parse('2026-11-01T04:59:59Z'),after=Date.parse('2026-11-01T05:00:00Z');expect(nextComfortRefresh(before)).toBe(after);expect(comfortHour(before)).not.toBe(comfortHour(after));const old=comforts.map((_,i)=>hourlyComfort(i,comfortHour(before)).message),fresh=comforts.map((_,i)=>hourlyComfort(i,comfortHour(after)).message);expect(new Set(old).size).toBe(5);expect(fresh.every(message=>!old.includes(message))).toBe(true);expect(hourlyComfort(0,comfortHour(after+1000))).toEqual(hourlyComfort(0,comfortHour(after)));});
 it('catches the aligned cat and leaves gaps as gentle near misses',()=>{clawSlots.forEach((slot,i)=>expect(catchAt(slot)).toBe(i));expect(catchAt(135)).toBeNull();expect(catchAt(555)).toBe(4)});
 it('keeps the guide reachable after dragging or resizing',()=>{expect(clampGuide(-100,-100,390,700)).toEqual({x:8,y:8});expect(clampGuide(1000,1000,390,700)).toEqual({x:296,y:604});expect(clampGuide(100,100,40,40)).toEqual({x:8,y:8})});
 it('has a distinct, kind prize for every claw slot',()=>{expect(comforts).toHaveLength(clawSlots.length);expect(new Set(comforts.map(p=>p.id)).size).toBe(5);expect(comforts.every(p=>p.message&&p.action)).toBe(true)});
});
