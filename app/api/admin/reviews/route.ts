import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {adminGate} from "@/lib/api";
export const dynamic="force-dynamic";
export async function GET(req:Request){const denied=await adminGate(req);if(denied)return denied;return NextResponse.json({reviews:await prisma.review.findMany({orderBy:{createdAt:"desc"},take:200,include:{user:{select:{name:true,email:true}},product:{select:{name:true}}}})});}
