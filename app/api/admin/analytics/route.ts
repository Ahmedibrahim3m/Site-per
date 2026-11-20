import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {adminGate} from "@/lib/api";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 const [orderCount,pendingPayment,confirmedRevenue,lowStock,topRows,reviewsPending] = await Promise.all([
  prisma.order.count(),
  prisma.order.count({where:{paymentStatus:{in:["PENDING","PROOF_SUBMITTED"]},status:{not:"CANCELLED"}}}),
  prisma.order.aggregate({where:{paymentStatus:"CONFIRMED",status:{not:"CANCELLED"}},_sum:{total:true}}),
  prisma.product.findMany({where:{active:true,stock:{lte:5}},orderBy:{stock:"asc"},take:8,select:{id:true,name:true,stock:true}}),
  prisma.orderItem.groupBy({by:["productId"],where:{order:{status:{not:"CANCELLED"}}},_sum:{quantity:true},orderBy:{_sum:{quantity:"desc"}},take:5}),
  prisma.review.count({where:{status:"PENDING"}}),
 ]);
 const products=await prisma.product.findMany({where:{id:{in:topRows.map(x=>x.productId)}},select:{id:true,name:true}});
 return NextResponse.json({orderCount,pendingPayment,confirmedRevenue:confirmedRevenue._sum.total||0,lowStock,topProducts:topRows.map(x=>({name:products.find(p=>p.id===x.productId)?.name||"Product",quantity:x._sum.quantity||0})),reviewsPending});
}
