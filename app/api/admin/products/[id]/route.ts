import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError } from "@/lib/api";
import { parseProduct } from "@/lib/admin-validation";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:Request,{params}:Ctx){
 const denied=await adminGate(req);if(denied)return denied;
 let body;try{body=await req.json()}catch{return jsonError("Invalid JSON");}
 const data=parseProduct(body);if(!data)return jsonError("Invalid product details");
 const {id}=await params;
 try{
  const collection=await prisma.collection.findUnique({where:{id:data.collectionId}});
  if(!collection)return jsonError("Collection not found",404);
  const product=await prisma.product.update({where:{id},data});
  return NextResponse.json({product});
 }catch{return jsonError("Product not found or could not be updated",404);}
}
export async function DELETE(req:Request,{params}:Ctx){
 const denied=await adminGate(req);if(denied)return denied;
 const {id}=await params;
 try{
  // Archive rather than physically delete: preserve historical orders and their product references.
  await prisma.product.update({where:{id},data:{active:false}});
  return NextResponse.json({ok:true});
 }catch{return jsonError("Product not found",404);}
}
