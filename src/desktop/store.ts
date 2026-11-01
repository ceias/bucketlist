import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { comfortHour } from './model';
type State={catVisible:boolean;catPosition:{x:number;y:number};desktopPhoto:string;collection:string[];collectionHour:number;set:(value:Partial<Omit<State,'set'|'collect'|'refreshCollection'>>)=>void;collect:(id:string)=>void;refreshCollection:(now?:number)=>void};
export const useDesk=create<State>()(persist(set=>({catVisible:true,catPosition:{x:.7,y:.75},desktopPhoto:'',collection:[],collectionHour:comfortHour(),set:patch=>set(patch),refreshCollection:(now=Date.now())=>set(s=>s.collectionHour===comfortHour(now)?{}:{collection:[],collectionHour:comfortHour(now)}),collect:id=>set(s=>{const hour=comfortHour();const collection=s.collectionHour===hour?s.collection:[];return {collectionHour:hour,collection:collection.includes(id)?collection:[...collection,id]}})}),{name:'gio-cozy-desk'}));
