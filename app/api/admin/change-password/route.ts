import { NextResponse } from "next/server";
import { adminGate, jsonError } from "@/lib/api";
import { getCurrentUser, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
export async function POST(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 const user=await getCurrentUser();if(!user)return jsonError("Not signed in",401);
 let b:Record<string,unknown>;try{b=await req.json()}catch{return jsonError("Invalid JSON");}
 const oldPass=typeof b.currentPassword==="string"?b.currentPassword:"";
 const newPass=typeof b.newPassword==="string"?b.newPassword:"";
 if(newPass.length<12||newPass.length>128)return jsonError("New password must have 12–128 characters.");
 const current=await prisma.user.findUnique({where:{id:user.id}});
 if(!current||!(await verifyPassword(oldPass,current.passwordHash)))return jsonError("Current password is incorrect",401);
 await prisma.user.update({where:{id:user.id},data:{passwordHash:await hashPassword(newPass)}});
 await prisma.session.deleteMany({where:{userId:user.id}});
 await createSession(user.id);
 return NextResponse.json({ok:true});
}
