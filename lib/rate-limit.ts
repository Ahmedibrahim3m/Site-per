// Basic in-memory throttling for local MVP. Use a shared store (e.g. Redis) on multi-instance hosting.
const events=new Map<string,{count:number,until:number}>();
export function tooManyAttempts(key:string,limit=8,windowMs=15*60_000){
 const now=Date.now();
 if(events.size>4000){for(const [k,v] of events){if(v.until<=now)events.delete(k);}}
 const current=events.get(key);
 if(!current||current.until<now){events.set(key,{count:1,until:now+windowMs});return false;}
 current.count++;return current.count>limit;
}
