import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {adminGate,jsonError} from "@/lib/api";
import {getCurrentUser,isSameOrigin} from "@/lib/auth";
import {publicVapidKey} from "@/lib/push";
export const dynamic="force-dynamic";
const allowed=["NEW_ORDER","PAYMENT_UPDATE","SHIPPING","INVENTORY","REVIEW","SYSTEM"];
function validEndpoint(value:unknown){
 if(typeof value!=="string"||value.length>2000)return false;
 try{const url=new URL(value);const hostname=url.hostname.toLowerCase();return url.protocol==="https:"&&(hostname==="fcm.googleapis.com"||hostname==="fcm-xm.googleapis.com"||hostname==="updates.push.services.mozilla.com"||hostname==="web.push.apple.com"||hostname.endsWith(".notify.windows.com")||hostname.endsWith(".push.apple.com")||hostname==="updates.push.services.mozilla.org");}catch{return false;}
}
function validKeys(b:Record<string,unknown>){return typeof b.p256dh==="string"&&b.p256dh.length>=40&&b.p256dh.length<=250&&/^[A-Za-z0-9_-]+$/.test(b.p256dh)&&typeof b.auth==="string"&&b.auth.length>=12&&b.auth.length<=150&&/^[A-Za-z0-9_-]+$/.test(b.auth);}
export async function GET(req:Request){const denied=await adminGate(req);if(denied)return denied;const user=await getCurrentUser();if(!user)return jsonError("Not signed in",401);const subscriptions=await prisma.pushSubscription.findMany({where:{userId:user.id,active:true},select:{id:true,endpoint:true,kinds:true,createdAt:true}});return NextResponse.json({vapidPublicKey:publicVapidKey(),enabled:Boolean(publicVapidKey()),devices:subscriptions.map(s=>({id:s.id,endpoint:s.endpoint,endpointHint:s.endpoint.slice(0,40),kinds:JSON.parse(s.kinds),createdAt:s.createdAt}))});}
export async function POST(req:Request){if(!isSameOrigin(req))return jsonError("Invalid origin",403);const denied=await adminGate(req);if(denied)return denied;const user=await getCurrentUser();if(!user)return jsonError("Not signed in",401);if(!publicVapidKey())return jsonError("Web Push is not configured on this server",503);
 let b:Record<string,unknown>;try{b=await req.json()}catch{return jsonError("Invalid JSON");}
 if(!validEndpoint(b.endpoint)||!validKeys(b))return jsonError("Invalid browser push subscription");
 if(!Array.isArray(b.kinds)||b.kinds.length>allowed.length||b.kinds.some(k=>typeof k!=="string"||!allowed.includes(k)))return jsonError("Invalid notification preferences");
 const endpoint=b.endpoint as string;const owned=await prisma.pushSubscription.findUnique({where:{endpoint},select:{userId:true}});if(owned&&owned.userId!==user.id)return jsonError("Device already associated with another account",409);
 const sub=await prisma.pushSubscription.upsert({where:{endpoint},create:{userId:user.id,endpoint,p256dh:String(b.p256dh),auth:String(b.auth),kinds:JSON.stringify(b.kinds)},update:{active:true,p256dh:String(b.p256dh),auth:String(b.auth),kinds:JSON.stringify(b.kinds)}});
 return NextResponse.json({ok:true,id:sub.id});
}
export async function DELETE(req:Request){if(!isSameOrigin(req))return jsonError("Invalid origin",403);const denied=await adminGate(req);if(denied)return denied;const user=await getCurrentUser();if(!user)return jsonError("Not signed in",401);let b:Record<string,unknown>;try{b=await req.json()}catch{return jsonError("Invalid JSON");}if(typeof b.id!=="string")return jsonError("Select a device");const result=await prisma.pushSubscription.deleteMany({where:{id:b.id,userId:user.id}});return result.count?NextResponse.json({ok:true}):jsonError("Device not found",404);}
