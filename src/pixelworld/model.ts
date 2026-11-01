export const WIDTH=20,HEIGHT=14;
export type Tile='grass'|'wood'|'stone'|'flower'|'heart'|'water';
export type Block='wood'|'stone'|'flower';
export type World={tiles:Tile[];x:number;y:number;facing:[number,number];inventory:Record<Block,number>;hearts:number;built:number};
export function newWorld():World{return {tiles:Array.from({length:WIDTH*HEIGHT},(_,i)=>{const x=i%WIDTH,y=Math.floor(i/WIDTH);if(x<5&&y<5)return 'grass';if((x===8&&y===3)||(x===15&&y===10)||(x===4&&y===11))return 'heart';if(x>13&&y<5)return 'water';return (x*7+y*11)%13===0?'stone':(x*3+y*7)%9===0?'wood':(x+y*3)%17===0?'flower':'grass'}),x:2,y:2,facing:[1,0],inventory:{wood:5,stone:5,flower:3},hearts:0,built:0}}
export function move(world:World,dx:number,dy:number):World{const x=world.x+dx,y=world.y+dy;const next={...world,facing:[dx,dy] as [number,number]};if(x<0||y<0||x>=WIDTH||y>=HEIGHT||!['grass','flower','heart'].includes(world.tiles[y*WIDTH+x]))return next;if(world.tiles[y*WIDTH+x]==='heart'){const tiles=[...world.tiles];tiles[y*WIDTH+x]='grass';return {...next,x,y,tiles,hearts:world.hearts+1}}return {...next,x,y}}
export function interact(world:World,x:number,y:number,mode:'mine'|'build',block:Block):{world:World;message:string}{
 if(x<0||y<0||x>=WIDTH||y>=HEIGHT||Math.abs(x-world.x)+Math.abs(y-world.y)!==1)return {world,message:'Choose a square right next to you. Move closer with the arrows.'};
 const index=y*WIDTH+x,tile=world.tiles[index],tiles=[...world.tiles],inventory={...world.inventory};
 if(mode==='mine'){
  if(!['wood','stone','flower'].includes(tile))return {world,message:tile==='heart'?'Walk onto the heart to keep it. ♡':'Find a tree, stone or flower to collect.'};
  inventory[tile as Block]++;tiles[index]='grass';return {world:{...world,tiles,inventory},message:`Collected ${tile}. A little more room to dream.`};
 }
 if(tile!=='grass')return {world,message:'Build on an empty grass square.'};
 if(!inventory[block])return {world,message:`Collect more ${block} first.`};
 inventory[block]--;tiles[index]=block;return {world:{...world,tiles,inventory,built:world.built+1},message:`Placed ${block}. You’re making this place yours, Gio.`};
}
export function validWorld(value:unknown):value is World{const w=value as World;return !!w&&Array.isArray(w.tiles)&&w.tiles.length===WIDTH*HEIGHT&&w.tiles.every(t=>['grass','wood','stone','flower','heart','water'].includes(t))&&Number.isInteger(w.x)&&w.x>=0&&w.x<WIDTH&&Number.isInteger(w.y)&&w.y>=0&&w.y<HEIGHT&&Array.isArray(w.facing)&&w.facing.length===2&&w.facing.every(Number.isInteger)&&Math.abs(w.facing[0])+Math.abs(w.facing[1])===1&&!!w.inventory&&['wood','stone','flower'].every(k=>Number.isInteger(w.inventory[k as Block])&&w.inventory[k as Block]>=0)&&Number.isInteger(w.hearts)&&w.hearts>=0&&w.hearts<=3&&Number.isInteger(w.built)&&w.built>=0}
