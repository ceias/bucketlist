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

export const HOUR_MS=60*60*1000;
export const comfortHour=(now=Date.now())=>Math.floor(now/HOUR_MS);
export const nextComfortRefresh=(now=Date.now())=>(comfortHour(now)+1)*HOUR_MS;
const hourlyMessages=[
 'You don’t have to make today perfect. A little rest still counts.',
 'You have a place here, even when you don’t have the words.',
 'One small step is enough for right now. The next one can wait.',
 'Somewhere in our little world, there is always a place saved for you. ♡',
 'Official cat business: please accept one imaginary hug.',
 'A slow day can still hold one lovely little moment.',
 'You can tell me the messy version. It doesn’t need to sound pretty.',
 'Let’s leave a little room in today for something that makes us smile.',
 'You don’t have to carry every thought by yourself.',
 'I’d choose an ordinary afternoon with you, every time.',
 'A snack, a stretch, a silly story. Small things count too.',
 'We can make plans another day. Today, it’s enough to be here.',
 'Your tired self is just as welcome as your cheerful self.',
 'If the day feels too loud, we can find a quieter little corner.',
 'There are still photos to take and little places to discover together.',
 'Nothing impressive required. Your company is already my favorite part.',
 'We’re allowed to pause and start again, as many times as we need.',
 'A tiny cat has checked the records: you deserve a little kindness today.',
 'Let’s keep one good moment from this hour, however small.',
 'A day doesn’t have to be special to become a memory with you.',
 'You can miss someone and still make a little space for joy.',
 'A little laughter belongs here, even on an imperfect day.',
 'You are more than the things you managed to finish today.',
 'For this moment, there’s nowhere else you have to be. ♡'
];
const hourlyActions=[
 'Take one quiet breath at your own pace.',
 'Leave your person a small, kind note.',
 'Choose one tiny adventure for another day.',
 'Send a thinking-of-you heart from Together.',
 'Tell each other the silliest thing you saw today.',
 'Name one small thing you appreciated about this hour.',
 'Pick a photo that makes you smile.',
 'Share a song that reminds you of each other.',
 'Stretch your hands and get a little comfortable.',
 'Ask your person what would make today a little easier.'
];
export function hourlyComfort(index:number,hour=comfortHour()){
 const cat=comforts[index];if(!cat)throw Error('Choose a cat from this jar.');
 return {...cat,message:hourlyMessages[((hour*5+index)%hourlyMessages.length+hourlyMessages.length)%hourlyMessages.length],action:hourlyActions[((hour+index)%hourlyActions.length+hourlyActions.length)%hourlyActions.length]};
}
