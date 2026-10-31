import { afterEach, describe, expect, it, vi } from 'vitest';
import { withRequestDeadline, SAVE_TIMEOUT_MS } from './requestDeadline';
afterEach(()=>vi.useRealTimers());
describe('cloud save deadline',()=>{
  it('stops a hanging request and aborts its fetch instead of leaving the import busy forever',async()=>{
    vi.useFakeTimers(); let signal:AbortSignal|undefined;
    const pending=withRequestDeadline(s=>{signal=s;return new Promise(()=>{});});
    const assertion=expect(pending).rejects.toThrow('Supabase did not respond within 15 seconds');
    await vi.advanceTimersByTimeAsync(SAVE_TIMEOUT_MS);
    await assertion;expect(signal!.aborted).toBe(true);expect(vi.getTimerCount()).toBe(0);
  });
  it('returns successful responses and removes the timeout',async()=>{
    vi.useFakeTimers();const result=await withRequestDeadline(async()=>({error:null}));
    expect(result).toEqual({error:null});expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves a real request failure and removes the timeout',async()=>{
    vi.useFakeTimers();await expect(withRequestDeadline(async()=>{throw Error('Access denied');})).rejects.toThrow('Access denied');
    expect(vi.getTimerCount()).toBe(0);
  });
});
