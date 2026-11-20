import { NextResponse } from "next/server";
import {prisma} from "@/lib/db";
import {jsonError} from "@/lib/api";
import {cleanCart,calculateQuote,PAYMENT_METHODS,publicQuoteError} from "@/lib/pricing";
import type {PaymentMethod} from "@prisma/client";
import {isSameOrigin} from "@/lib/auth";

export async function POST(req:Request){
 if(!isSameOrigin(req))return jsonError("Invalid request origin",403);
 let value:unknown;try{value=await req.json()}catch{return jsonError("Invalid JSON");}
 if(!value||typeof value!=="object"||Array.isArray(value))return jsonError("Invalid request body");const b=value as Record<string,unknown>;
 const method=String(b.paymentMethod??"");
 if(!PAYMENT_METHODS.has(method))return jsonError("Invalid payment method");
 let items;try{items=cleanCart(b.items)}catch(e){return jsonError((e as Error).message);}
 try{
  const quote=await prisma.$transaction(tx=>calculateQuote(tx,{items,governorate:String(b.governorate||""),paymentMethod:method as PaymentMethod,couponCode:String(b.couponCode||"").slice(0,30)}));
  return NextResponse.json({subtotal:quote.subtotal,discount:quote.discount,shipping:quote.shipping,total:quote.total,code:quote.coupon?.code||null,zoneName:quote.zone.name,etaDays:quote.zone.etaDays});
 }catch(e){return jsonError(publicQuoteError(e),400);}
}
