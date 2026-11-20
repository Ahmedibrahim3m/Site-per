import { NextResponse } from "next/server";
import {prisma} from "@/lib/db";
import {adminGate,jsonError} from "@/lib/api";
export const dynamic="force-dynamic";
export async function GET(req:Request){const denied=await adminGate(req);if(denied)return denied;return NextResponse.json({zones:await prisma.shippingZone.findMany({orderBy:{name:"asc"}})});}
export async function PATCH(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 let b:Record<string,unknown>;try{b=await req.json()}catch{return jsonError("Invalid JSON");}
 const {id,fee,active,codAvailable,etaDays}=b;
 if(typeof id!=="string"||typeof fee!=="number"||!Number.isSafeInteger(fee)||fee<0||fee>20000||typeof etaDays!=="number"||!Number.isSafeInteger(etaDays)||etaDays<1||etaDays>60||typeof active!=="boolean"||typeof codAvailable!=="boolean")return jsonError("Invalid shipping zone settings");
 try{return NextResponse.json({zone:await prisma.shippingZone.update({where:{id},data:{fee,active,codAvailable,etaDays}})});}catch{return jsonError("Zone not found",404);}
}

/** Atomic bulk update: validate the entire batch before touching any zone. */
export async function PUT(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 let b:Record<string,unknown>;try{b=await req.json()}catch{return jsonError("Invalid JSON");}
 if(!Array.isArray(b.zones)||b.zones.length<1||b.zones.length>30)return jsonError("Select 1–30 zones to save.");
 const zones=b.zones as Record<string,unknown>[];
 const ids=new Set<string>();
 for(const z of zones){
  if(!z||typeof z.id!=="string"||z.id.length>100||ids.has(z.id)||!Number.isSafeInteger(z.fee)||Number(z.fee)<0||Number(z.fee)>20000||!Number.isSafeInteger(z.etaDays)||Number(z.etaDays)<1||Number(z.etaDays)>60||typeof z.active!=="boolean"||typeof z.codAvailable!=="boolean")return jsonError("One or more shipping zones have invalid settings.");
  ids.add(z.id);
 }
 try{
  const available=await prisma.shippingZone.count({where:{id:{in:[...ids]}}});
  if(available!==zones.length)return jsonError("A selected shipping zone no longer exists. Refresh before saving.",409);
  const result=await prisma.$transaction(zones.map(z=>prisma.shippingZone.update({where:{id:String(z.id)},data:{fee:Number(z.fee),etaDays:Number(z.etaDays),active:Boolean(z.active),codAvailable:Boolean(z.codAvailable)}})));
  return NextResponse.json({zones:result,updated:result.length});
 }catch{return jsonError("Unable to save shipping zones. No changes were committed.",503);}
}
