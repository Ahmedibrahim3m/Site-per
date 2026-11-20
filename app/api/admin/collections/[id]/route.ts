import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError } from "@/lib/api";
import { parseCollection } from "@/lib/admin-validation";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:Request,{params}:Ctx){
 const denied=await adminGate(req);if(denied)return denied;
 let body;try{body=await req.json()}catch{return jsonError("Invalid JSON");}
 const data=parseCollection(body);if(!data)return jsonError("Invalid collection details");
 try{return NextResponse.json({collection:await prisma.collection.update({where:{id:(await params).id},data})});}catch{return jsonError("Collection not found",404);}
}
export async function DELETE(req:Request,{params}:Ctx){
 const denied=await adminGate(req);if(denied)return denied;
 try{await prisma.collection.update({where:{id:(await params).id},data:{active:false}});return NextResponse.json({ok:true});}
 catch{return jsonError("Collection not found",404);}
}
