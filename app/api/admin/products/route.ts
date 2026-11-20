import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError, slugify } from "@/lib/api";
import { parseProduct } from "@/lib/admin-validation";
import { randomBytes } from "node:crypto";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 try{return NextResponse.json({products:await prisma.product.findMany({orderBy:{name:"asc"}})});}catch{return jsonError("Unable to load products",503);}
}
export async function POST(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 let body;try{body=await req.json()}catch{return jsonError("Invalid JSON");}
 const data=parseProduct(body);if(!data)return jsonError("Check product details, HTTPS image, price and stock.");
 try{
  const collection=await prisma.collection.findUnique({where:{id:data.collectionId}});
  if(!collection)return jsonError("Select a valid collection");
  const product=await prisma.product.create({data:{...data,slug:`${slugify(data.name)}-${randomBytes(3).toString("hex")}`}});
  return NextResponse.json({product},{status:201});
 }catch(e){console.error("Create product failed",e);return jsonError("Could not create product",500);}
}
