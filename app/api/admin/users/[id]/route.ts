import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError } from "@/lib/api";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:Request,{params}:Ctx){
 const denied=await adminGate(req);if(denied)return denied;
 let b:Record<string,unknown>;try{b=await req.json()}catch{return jsonError("Invalid JSON");}
 if(typeof b.active!=="boolean")return jsonError("Invalid account status");
 const {id}=await params;
 const count=await prisma.user.updateMany({where:{id,role:"USER"},data:{active:b.active}});
 if(!count.count)return jsonError("Customer not found",404);
 return NextResponse.json({ok:true});
}
