import {create} from 'zustand';
import {persist} from 'zustand/middleware';
type Preferences={theme:string;wallpaper:string;motion:boolean;font:string;set:(patch:Partial<Omit<Preferences,'set'>>)=>void};
export const usePreferences=create<Preferences>()(persist(set=>({theme:'strawberry',wallpaper:'gingham',motion:true,font:'rounded',set:patch=>set(patch)}),{name:'gio-me-preferences'}));
