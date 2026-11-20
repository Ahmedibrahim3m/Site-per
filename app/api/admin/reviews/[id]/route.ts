import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {adminGate,jsonError} from "@/lib/api";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:Request,{params}:Ctx){
 const denied=await adminGate(req);if(denied)return denied;
 let b:Record<string,unknown>;try{b=await req.json()}catch{return jsonError("Invalid JSON");}
 const data:{status?:"PENDING"|"APPROVED"|"REJECTED";adminReply?:string;repliedAt?:Date;moderationNote?:string}={};
 if(b.status!==undefined){if(!["PENDING","APPROVED","REJECTED"].includes(String(b.status)))return jsonError("Invalid review status");data.status=b.status as "PENDING"|"APPROVED"|"REJECTED";}
 if(b.adminReply!==undefined){if(typeof b.adminReply!=="string"||b.adminReply.length>1200)return jsonError("Reply must be under 1,200 characters");data.adminReply=b.adminReply.trim();data.repliedAt=data.adminReply?new Date():undefined;}
 if(b.moderationNote!==undefined){if(typeof b.moderationNote!=="string"||b.moderationNote.length>500)return jsonError("Moderation note must be under 500 characters");data.moderationNote=b.moderationNote.trim();}
 if(!Object.keys(data).length)return jsonError("No review updates provided");
 try{return NextResponse.json({review:await prisma.review.update({where:{id:(await params).id},data})});}catch{return jsonError("Review not found",404);}
}
