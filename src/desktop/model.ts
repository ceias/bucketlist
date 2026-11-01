export const clawSlots=[80,190,300,410,520];
export function catchAt(position:number){let nearest=0;clawSlots.forEach((x,i)=>{if(Math.abs(x-position)<Math.abs(clawSlots[nearest]-position))nearest=i});return Math.abs(clawSlots[nearest]-position)<=37?nearest:null;}
export function clampGuide(x:number,y:number,width:number,height:number){return {x:Math.max(8,Math.min(x,Math.max(8,width-94))),y:Math.max(8,Math.min(y,Math.max(8,height-96)))}}
export const comforts=[
 {id:'peach',name:'Peach, the comfort cat',color:'#edb77e',message:'You don’t have to make today perfect. A little rest still counts.',action:'Take one quiet breath together.'},
 {id:'cloud',name:'Cloud, the gentle cat',color:'#eee6db',message:'Even on the heavy days, you are still worthy of love.',action:'Leave your person a small, kind note.'},
 {id:'matcha',name:'Matcha, the brave cat',color:'#b6c392',message:'One small step is enough for right now. We can figure out the next one later.',action:'Choose one tiny adventure for another day.'},
 {id:'rose',name:'Rose, the love cat',color:'#e8abbc',message:'Somewhere in our little world, there is always a place saved for you. ♡',action:'Send a thinking-of-you heart from Together.'},
 {id:'blue',name:'Blue, the silly cat',color:'#adcbd6',message:'Official cat business: you are required to unclench your shoulders and accept one imaginary hug.',action:'Tell each other the silliest thing you saw today.'}
];
