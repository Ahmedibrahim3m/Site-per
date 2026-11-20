/** Best-effort, server-only push delivery. Never expose the private VAPID key in the browser. */
import "server-only";
import webpush from "web-push";
import {prisma} from "@/lib/db";

const keysReady=Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT);
if(keysReady)webpush.setVapidDetails(process.env.VAPID_SUBJECT!,process.env.VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!);
export const publicVapidKey=()=>process.env.VAPID_PUBLIC_KEY||"";
export async function notifyAdministrators(kind:string,title:string,body:string,target="/admin?tab=notifications"){
 if(!keysReady&&!process.env.TELEGRAM_BOT_TOKEN)return;
 const admins=await prisma.user.findMany({where:{role:"ADMIN",active:true},select:{id:true}});
 const adminIds=admins.map(x=>x.id);
 if(keysReady&&adminIds.length){
  const subscriptions=await prisma.pushSubscription.findMany({where:{userId:{in:adminIds},active:true}});
  await Promise.allSettled(subscriptions.map(async s=>{
   const selected=(()=>{try{return JSON.parse(s.kinds) as string[];}catch{return [];}})();
   if(!selected.includes(kind))return;
   try{
    await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title,body,url:target,kind}),{TTL:60*60,timeout:6500});
   }catch(e){const status=(e as {statusCode?:number}).statusCode;if(status===404||status===410)await prisma.pushSubscription.update({where:{id:s.id},data:{active:false}}).catch(()=>{});}
  }));
 }
 if(process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_ADMIN_CHAT_ID){
  const allowed=(process.env.TELEGRAM_NOTIFICATION_KINDS||"NEW_ORDER,PAYMENT_UPDATE,REVIEW").split(",").includes(kind);
  if(allowed)try{await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:process.env.TELEGRAM_ADMIN_CHAT_ID,text:`NOIRÉ Admin — ${title}\n${body}`,disable_web_page_preview:true}),signal:AbortSignal.timeout(5000)});}catch{/* Keep order and review workflows independent of Telegram availability. */}
 }
}
