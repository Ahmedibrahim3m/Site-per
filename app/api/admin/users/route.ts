import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError } from "@/lib/api";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 try{
  const users=await prisma.user.findMany({where:{role:"USER"},orderBy:{createdAt:"desc"},take:200,select:{id:true,name:true,email:true,username:true,active:true,createdAt:true,_count:{select:{orders:true}}}});
  return NextResponse.json({users});
 }catch{return jsonError("Unable to load customers",503);}
}
