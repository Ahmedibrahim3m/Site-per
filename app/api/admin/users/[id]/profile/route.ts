import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {adminGate,jsonError} from "@/lib/api";
export const dynamic="force-dynamic";
type Ctx={params:Promise<{id:string}>};
export async function GET(req:Request,{params}:Ctx){
 const denied=await adminGate(req);if(denied)return denied;
 const {id}=await params;
 try{
  const [customer,orders,totalOrders,confirmed]=await Promise.all([
   prisma.user.findFirst({where:{id,role:"USER"},select:{id:true,name:true,username:true,email:true,active:true,createdAt:true}}),
   prisma.order.findMany({where:{userId:id},orderBy:{createdAt:"desc"},take:25,select:{id:true,reference:true,createdAt:true,status:true,paymentStatus:true,shippingStatus:true,total:true}}),
   prisma.order.count({where:{userId:id}}),
   prisma.order.aggregate({where:{userId:id,paymentStatus:"CONFIRMED",status:{not:"CANCELLED"}},_sum:{total:true}}),
  ]);
  if(!customer)return jsonError("Customer not found",404);
  return NextResponse.json({customer,orders,totalOrders,confirmedSpend:confirmed._sum.total||0});
 }catch{return jsonError("Unable to retrieve customer profile",503);}
}
