import { create } from 'zustand';
import { persist } from 'zustand/middleware';
type State={catVisible:boolean;catPosition:{x:number;y:number};desktopPhoto:string;collection:string[];set:(value:Partial<Omit<State,'set'|'collect'>>)=>void;collect:(id:string)=>void};
export const useDesk=create<State>()(persist(set=>({catVisible:true,catPosition:{x:.7,y:.75},desktopPhoto:'',collection:[],set:patch=>set(patch),collect:id=>set(s=>({collection:s.collection.includes(id)?s.collection:[...s.collection,id]}))}),{name:'gio-cozy-desk'}));
