import { describe, it, expect } from 'vitest';
import { displayName, welcomeCopy, validInvitation, PARTNER_WELCOME_MESSAGE, PARTNER_WELCOME_TITLE } from './copy';
describe('personal welcome and invitation validation',()=>{
 it('uses the exact welcome written for Gio',()=>{expect(welcomeCopy({user_metadata:{display_name:'Gio'}})).toMatchObject({title:PARTNER_WELCOME_TITLE,message:PARTNER_WELCOME_MESSAGE})});
 it('keeps another account’s welcome personal to that account',()=>{const welcome=welcomeCopy({user_metadata:{display_name:'Brisias'}});expect(welcome.title).toContain('Brisias');expect(welcome.message).not.toContain('I love you, Gio')});
 it('honors the privately saved invitation greeting',()=>{expect(welcomeCopy({user_metadata:{display_name:'Gio',welcome_title:'My love',welcome_message:'Our very own little world.'}}).message).toBe('Our very own little world.')});
 it('requires the full random invitation and handles missing account names',()=>{expect(validInvitation('a'.repeat(48))).toBe(true);expect(validInvitation('guess')).toBe(false);expect(displayName(null)).toBe('my love')});
});
