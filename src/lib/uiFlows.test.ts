import { describe, it, expect } from 'vitest';
import { parseBulkGoals } from './bulkGoals';
import { agendaOnDate, upcomingAgenda, calendarItems } from './agenda';
import { renamedPhoto, photoFileName } from './photos';
import type { Item } from '../stores/data';
const item = (patch: Partial<Item> = {}): Item => ({ id:'one',kind:'calendar',title:'A little date',date:'2027-02-13',body:'',category:'Together',amount:0,done:false,private:false,data:{},...patch });
describe('bulk goal import', () => {
  it('groups headings, Markdown bullets, exact dates and descriptions without guessing', () => {
    const result = parseBulkGoals('## November 2026 — Matching Era\n- Buy shirts\n2. Pick colors\n\nDecember 2026\n2026-12-12 | Food crawl | Food | Go Bento\nPhoto booth | 2026-12-13 | Memories','2026-10');
    expect(result.issues).toEqual([]);
    expect(result.rows.map(row=>[row.title,row.date,row.category,row.body])).toEqual([
      ['Buy shirts','2026-11-01','Monthly goals','Matching Era'], ['Pick colors','2026-11-01','Monthly goals','Matching Era'],
      ['Food crawl','2026-12-12','Food','Go Bento'], ['Photo booth','2026-12-13','Memories',''],
    ]);
  });
  it('skips duplicates across a paste and existing goals, but keeps the same goal on another date', () => {
    const result=parseBulkGoals('- BUY shirts\n- Buy   shirts\n2026-12-12 | Buy shirts','2026-11',[{title:'Buy shirts',date:'2026-11-01'}]);
    expect(result.rows.map(row=>row.duplicate)).toEqual([true,true,false]);
  });
  it('reports impossible dates and empty titles instead of silently shifting them', () => {
    const result=parseBulkGoals('2027-02-30 | Dinner\n2027-13-01 | No month\n2027-02-13 |','2027-02');
    expect(result.rows).toHaveLength(0); expect(result.issues).toHaveLength(3);
  });
  it('caps import size and rejects invalid defaults', () => {
    expect(parseBulkGoals(Array.from({length:201},(_,i)=>`Goal ${i}`).join('\n'),'2027-01').issues[0].message).toContain('200');
    expect(parseBulkGoals('A goal','2027-13').issues).toHaveLength(1);
  });
});
describe('calendar and agenda data', () => {
  const events=[item(),item({id:'goal',kind:'bucket',data:{showOnCalendar:true}}),item({id:'hidden',kind:'bucket'}),item({id:'deleted',deleted:true}),item({id:'completed',done:true}),item({id:'past',date:'2026-01-01'})];
  it('includes opted-in goals, hides deleted/undated records and keeps day completion visible', () => {
    expect(calendarItems(events).map(i=>i.id)).toEqual(['one','goal','completed','past']);
    expect(agendaOnDate(events,'2027-02-13')).toHaveLength(3);
    expect(upcomingAgenda(events,new Date(2027,0,1)).map(i=>i.id)).toEqual(['one','goal']);
  });
});
describe('photo metadata', () => {
  it('renames the downloaded file without losing photo data or changing its image format', () => {
    const photo=item({kind:'gallery',title:'old',data:{path:'workspace/user/random.png',mimeType:'image/png'}});
    const renamed=renamedPhoto(photo,'Our picnic.jpg',' Our first little picnic. ','Adventures');
    expect(renamed.title).toBe('Our picnic');expect(photoFileName(renamed)).toBe('Our picnic.png');
    expect(renamed.data.path).toBe(photo.data.path);expect(renamed.body).toBe('Our first little picnic.');
  });
  it('supports existing photos and rejects invalid names', () => {
    const photo=item({kind:'gallery',data:{localUrl:'data:image/webp;base64,AA'}});
    expect(photoFileName(photo)).toBe('A little date.webp');
    expect(()=>renamedPhoto(photo,'../photo','note','Little Moments')).toThrow();
    expect(()=>renamedPhoto(photo,'   ','note','Little Moments')).toThrow();
  });
});
