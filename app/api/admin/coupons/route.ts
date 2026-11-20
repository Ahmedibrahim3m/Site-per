import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {adminGate,jsonError} from "@/lib/api";
import {parseCoupon} from "@/lib/coupon-validation";
export const dynamic="force-dynamic";
export async function GET(req:Request){const denied=await adminGate(req);if(denied)return denied;return NextResponse.json({coupons:await prisma.coupon.findMany({orderBy:{createdAt:"desc"}})});}
export async function POST(req:Request){const denied=await adminGate(req);if(denied)return denied;let b:unknown;try{b=await req.json()}catch{return jsonError("Invalid JSON");}const coupon=parseCoupon(b);if(!coupon)return jsonError("Invalid coupon details");try{return NextResponse.json({coupon:await prisma.coupon.create({data:coupon})},{status:201});}catch{return jsonError("Coupon code already exists or could not be created",409);}}
