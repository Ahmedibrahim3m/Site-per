import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError, slugify } from "@/lib/api";
import { parseCollection } from "@/lib/admin-validation";
import { randomBytes } from "node:crypto";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 try{return NextResponse.json({collections:await prisma.collection.findMany({orderBy:{sortOrder:"asc"},include:{_count:{select:{products:{where:{active:true}}}}}})});}catch{return jsonError("Could not load collections",503);}
}
export async function POST(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 let body;try{body=await req.json()}catch{return jsonError("Invalid JSON");}
 const data=parseCollection(body);if(!data)return jsonError("Enter a valid collection name, order and image URL.");
 try{
  const collection=await prisma.collection.create({data:{...data,slug:`${slugify(data.name)}-${randomBytes(3).toString("hex")}`}});
  return NextResponse.json({collection},{status:201});
 }catch{return jsonError("Could not create collection",500);}
}
