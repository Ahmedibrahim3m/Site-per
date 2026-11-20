import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {adminGate,jsonError} from "@/lib/api";
import {parseCoupon} from "@/lib/coupon-validation";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:Request,{params}:Ctx){const denied=await adminGate(req);if(denied)return denied;let b:unknown;try{b=await req.json()}catch{return jsonError("Invalid JSON");}const coupon=parseCoupon(b);if(!coupon)return jsonError("Invalid coupon details");const {id}=await params;try{return NextResponse.json({coupon:await prisma.coupon.update({where:{id},data:coupon})});}catch{return jsonError("Coupon not found or code already taken",409);}}
export async function DELETE(req:Request,{params}:Ctx){const denied=await adminGate(req);if(denied)return denied;const {id}=await params;try{return NextResponse.json({coupon:await prisma.coupon.update({where:{id},data:{active:false}})});}catch{return jsonError("Coupon not found",404);}}
