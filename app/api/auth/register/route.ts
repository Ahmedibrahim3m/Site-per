import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, isSameOrigin, publicUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { jsonError } from "@/lib/api";
import { tooManyAttempts } from "@/lib/rate-limit";

export async function POST(req:Request){
 if(!isSameOrigin(req))return jsonError("Invalid request origin",403);
 const ip=req.headers.get("x-forwarded-for")?.split(",")[0]||"local";
 if(tooManyAttempts(`register:${ip}`,12))return jsonError("Too many sign-up attempts. Try again later.",429);
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return jsonError("Invalid JSON");}
 const name=typeof body.name==="string"?body.name.trim():"";
 const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
 const password=typeof body.password==="string"?body.password:"";
 if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>180||password.length<8||password.length>128)return jsonError("Enter a valid name, email and password (8+ characters).");
 try{
   // Important: role is always USER. The client cannot request ADMIN.
   const user=await prisma.user.create({data:{name,email,username:email,passwordHash:await hashPassword(password),role:"USER"}});
   await createSession(user.id);
   return NextResponse.json({user:publicUser(user)},{status:201});
 }catch(e){console.error("Signup failed",e);return jsonError("This email is already registered or registration is unavailable.",409);}
}
