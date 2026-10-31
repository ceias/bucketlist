import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppId } from '../lib/apps';
export type OSWindow = {id:AppId;x:number;y:number;width:number;height:number;minimized:boolean;maximized:boolean;z:number};
export const clampPosition=(x:number,y:number,width:number,height:number,windowWidth=160,windowHeight=70)=>({x:Math.max(0,Math.min(x,Math.max(0,width-windowWidth))),y:Math.max(0,Math.min(y,Math.max(0,height-windowHeight)))});
type State={windows:OSWindow[];top:number;open:(id:AppId)=>void;close:(id:AppId)=>void;focus:(id:AppId)=>void;update:(id:AppId,patch:Partial<OSWindow>)=>void};
export const useWindows=create<State>()(persist((set,get)=>({windows:[],top:10,
 open:(id)=>set(s=>{const found=s.windows.find(w=>w.id===id);return {top:s.top+1,windows:found?s.windows.map(w=>w.id===id?{...w,minimized:false,z:s.top+1}:w):[...s.windows,{id,x:Math.min(110+s.windows.length*24,220),y:40+s.windows.length*22,width:Math.min(880,window.innerWidth-145),height:Math.min(620,window.innerHeight-145),minimized:false,maximized:false,z:s.top+1}]}}),
 close:(id)=>set(s=>({windows:s.windows.filter(w=>w.id!==id)})),
 focus:(id)=>{if(get().windows.find(w=>w.id===id)?.z===get().top)return;set(s=>({top:s.top+1,windows:s.windows.map(w=>w.id===id?{...w,z:s.top+1}:w)}))},
 update:(id,patch)=>set(s=>({windows:s.windows.map(w=>w.id===id?{...w,...patch}:w)}))
}),{name:'gio-me-windows',version:1}));
