import { NextResponse } from "next/server";
import { getCurrentUser, isSameOrigin } from "@/lib/auth";
export function jsonError(error:string,status=400){return NextResponse.json({error},{status});}
export async function adminGate(request:Request){
  if(!isSameOrigin(request)) return jsonError("Invalid request origin",403);
  const user=await getCurrentUser();
  if(!user) return jsonError("Please log in",401);
  if(user.role!=="ADMIN") return jsonError("Admin access required",403);
  return null;
}
export function safeString(x:unknown,max=500){return typeof x==="string"?x.trim().slice(0,max+1):"";}
export function validImageUrl(value:string){
 if((value.startsWith("/api/media/") && /^\/api\/media\/noire-[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/.test(value)) || (value.startsWith("/uploads/") && /^\/uploads\/[a-z0-9-]+\.(png|jpg|jpeg|webp)$/.test(value))) return true;
 try{const u=new URL(value);return u.protocol==="https:" && value.length<=1500;}catch{return false;}
}
export const asInt=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)?v:null;
export function slugify(value:string){return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,70)||"item";}
