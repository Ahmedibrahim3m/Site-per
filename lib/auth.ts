import { randomBytes, createHash } from "node:crypto";
export { hashPassword, verifyPassword } from "@/lib/password";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

const COOKIE_NAME = "noire_session";
const SESSION_DAYS = 7;

export type PublicUser = { id:string; username:string; name:string; email:string|null; role:Role };

function tokenHash(token:string){return createHash("sha256").update(token).digest("hex");}

export async function getCurrentUser():Promise<PublicUser|null>{
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if(!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  try {
    const session=await prisma.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});
    if(!session || session.expiresAt<=new Date() || !session.user.active) return null;
    const {id,username,name,email,role}=session.user;
    return {id,username,name,email,role};
  } catch{return null;}
}

export async function createSession(userId:string){
  const token=randomBytes(32).toString("hex");
  const expiresAt=new Date(Date.now()+SESSION_DAYS*86400_000);
  await prisma.session.create({data:{userId,tokenHash:tokenHash(token),expiresAt}});
  (await cookies()).set(COOKIE_NAME,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});
}

export async function clearSession(){
  const jar=await cookies();
  const token=jar.get(COOKIE_NAME)?.value;
  if(token && /^[a-f0-9]{64}$/.test(token)){
    await prisma.session.deleteMany({where:{tokenHash:tokenHash(token)}}).catch(()=>{});
  }
  jar.delete(COOKIE_NAME);
}

export function isSameOrigin(request:Request){
  const origin=request.headers.get("origin");
  if(!origin)return true;
  try{return new URL(origin).host===new URL(request.url).host;}catch{return false;}
}
export function publicUser(user:{id:string;username:string;name:string;email:string|null;role:Role}):PublicUser{
 return {id:user.id,username:user.username,name:user.name,email:user.email,role:user.role};
}
