import { describe, expect, it } from 'vitest';
import { createId } from './id';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
describe('record IDs on localhost and LAN',()=>{
  it('uses the native UUID implementation when available',()=>{
    const known='12345678-1234-4123-8123-123456789abc';
    expect(createId({randomUUID:()=>known,getRandomValues:crypto.getRandomValues.bind(crypto)})).toBe(known);
  });
  it('generates valid random v4 UUIDs without randomUUID, as on HTTP network addresses',()=>{
    const source={getRandomValues:crypto.getRandomValues.bind(crypto)};
    const ids=Array.from({length:1000},()=>createId(source));
    expect(ids.every(id=>uuid.test(id))).toBe(true);expect(new Set(ids).size).toBe(1000);
  });
  it('explains how to recover when secure randomness is entirely unavailable',()=>{
    expect(()=>createId({} as Crypto)).toThrow('localhost or HTTPS');
  });
});
