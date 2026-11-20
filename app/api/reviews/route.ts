import {NextResponse,after} from "next/server";
import {notifyAdministrators} from "@/lib/push";
import {prisma} from "@/lib/db";
import {jsonError} from "@/lib/api";
import {getCurrentUser,isSameOrigin} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const productId=new URL(req.url).searchParams.get("productId")||"";
 if(!productId||productId.length>100)return jsonError("Invalid product ID");
 const [reviews,agg]=await Promise.all([prisma.review.findMany({where:{productId,status:"APPROVED"},orderBy:{createdAt:"desc"},take:20,include:{user:{select:{name:true}}}}),prisma.review.aggregate({where:{productId,status:"APPROVED"},_avg:{rating:true},_count:{_all:true}})]);
 const ratingCount=agg._count._all,averageRating=Math.round((agg._avg.rating||0)*10)/10;
 return NextResponse.json({reviews:reviews.map(r=>({id:r.id,rating:r.rating,title:r.title,body:r.body,createdAt:r.createdAt,name:r.user.name,adminReply:r.adminReply})),ratingCount,averageRating});
}
export async function POST(req:Request){
 if(!isSameOrigin(req))return jsonError("Invalid origin",403);
 const user=await getCurrentUser();if(!user||user.role!=="USER")return jsonError("Sign in as a customer to write a review",401);
 let value:unknown;try{value=await req.json()}catch{return jsonError("Invalid JSON");}
 if(!value||typeof value!=="object"||Array.isArray(value))return jsonError("Invalid request body");const b=value as Record<string,unknown>;
 const productId=String(b.productId??""),rating=b.rating,title=String(b.title??"").trim(),body=String(b.body??"").trim();
 if(productId.length<1||productId.length>100||!Number.isInteger(rating)||Number(rating)<1||Number(rating)>5||title.length>90||body.length<10||body.length>1000)return jsonError("Review must have a 1–5 star rating and 10–1000 character comment.");
 const purchased=await prisma.orderItem.findFirst({where:{productId,order:{userId:user.id,status:"DELIVERED"}}});
 if(!purchased)return jsonError("Only customers with a delivered purchase can review this perfume.",403);
 try{
 const review=await prisma.review.create({data:{productId,userId:user.id,rating:Number(rating),title,body,status:"PENDING"}});
 try{const admins=await prisma.user.findMany({where:{role:"ADMIN",active:true},select:{id:true}});if(admins.length)await prisma.notification.createMany({data:admins.map(admin=>({userId:admin.id,title:"Review awaiting moderation",message:"A new verified-purchase review needs your approval.",kind:"REVIEW"}))});}catch{/* Review stays safely pending even if the optional notification cannot be delivered. */}
 after(()=>notifyAdministrators("REVIEW","Review awaiting moderation","A verified-purchase review needs your attention.","/admin?tab=reviews"));
 return NextResponse.json({review},{status:201});
 }catch{return jsonError("You have already reviewed this perfume",409);}
}
