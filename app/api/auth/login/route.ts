import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, isSameOrigin, publicUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { jsonError } from "@/lib/api";
import { tooManyAttempts } from "@/lib/rate-limit";
export async function POST(req:Request){
 if(!isSameOrigin(req))return jsonError("Invalid request origin",403);
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return jsonError("Invalid JSON");}
 const identifier=typeof body.identifier==="string"?body.identifier.trim().toLowerCase():"";
 const password=typeof body.password==="string"?body.password:"";
 const ip=req.headers.get("x-forwarded-for")?.split(",")[0]||"local";
 if(tooManyAttempts(`login:${ip}:${identifier}`,8))return jsonError("Too many login attempts. Try again later.",429);
 if(!identifier||password.length>128||!password)return jsonError("Enter your email/username and password.");
 try{
   const user=await prisma.user.findFirst({where:{OR:[{username:identifier},{email:identifier}]}});
   // Use the same generic failure response for unknown users and incorrect passwords.
   const ok=user?await verifyPassword(password,user.passwordHash):false;
   if(!ok||!user?.active)return jsonError("Invalid login or password.",401);
   await createSession(user.id);
   return NextResponse.json({user:publicUser(user)});
 }catch(e){console.error("Login failed",e);return jsonError("Login temporarily unavailable",503);}
}
