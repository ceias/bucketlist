import { House, CalendarDays, Star, MapPinned, BookHeart, Wallet, Images, Shirt, Heart, StickyNote, Gift, Settings, Trash2 } from 'lucide-react';
export const apps = [
 {id:'home',name:'Our Little Corner',short:'Home',icon:House,color:'pink',caption:'A little overview of us'},
 {id:'calendar',name:'Our Calendar',short:'Calendar',icon:CalendarDays,color:'pink',caption:'Make a little time for us'},
 {id:'bucket',name:'Bucket List',short:'Bucket List',icon:Star,color:'yellow',caption:'Together, little by little'},
 {id:'dates',name:'Date Planner',short:'Date Planner',icon:MapPinned,color:'green',caption:'Our next adventure starts here'},
 {id:'journal',name:'Our Journal',short:'Journal',icon:BookHeart,color:'pink',caption:'The days we want to remember'},
 {id:'finances',name:'Little Funds',short:'Finances',icon:Wallet,color:'yellow',caption:'Saving for more memories'},
 {id:'gallery',name:'Memory Gallery',short:'Gallery',icon:Images,color:'green',caption:'Our story, one photograph at a time'},
 {id:'outfits',name:'Matching Era',short:'Outfits',icon:Shirt,color:'pink',caption:'Buy this month. Wear next month.'},
 {id:'anniversary',name:'Anniversary Vault',short:'Our Vault',icon:Heart,color:'pink',caption:'13 reasons, every February 13'},
 {id:'notes',name:'Little Notes',short:'Notes',icon:StickyNote,color:'yellow',caption:'Small thoughts, safely tucked away'},
 {id:'wishlist',name:'Our Wishlist',short:'Wishlist',icon:Gift,color:'green',caption:'Someday, with you'},
 {id:'settings',name:'Make It Ours',short:'Settings',icon:Settings,color:'green',caption:'Your own little corner'},
 {id:'trash',name:'Trash',short:'Trash',icon:Trash2,color:'cream',caption:'A second chance for little things'},
] as const;
export type AppId = typeof apps[number]['id'];
export const appById = (id:AppId) => apps.find(a=>a.id===id)!;
