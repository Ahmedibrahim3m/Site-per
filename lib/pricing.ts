import type { Prisma, PaymentMethod, Coupon } from "@prisma/client";

type Db = Prisma.TransactionClient;
export type CartInput = {productId:string;quantity:number};
export const EGYPT_PHONE = /^(?:\+20|0020|0)?1[0125]\d{8}$/;
export const PAYMENT_METHODS = new Set(["COD","WALLET","INSTAPAY"]);

export function cleanCart(value:unknown):CartInput[]{
 if(!Array.isArray(value)||value.length<1||value.length>40)throw new Error("Cart is empty or invalid.");
 const map=new Map<string,number>();
 for(const row of value){
  if(!row||typeof row!=="object")throw new Error("Invalid cart line.");
  const {productId,quantity}=row as Record<string,unknown>;
  if(typeof productId!=="string"||productId.length>100||!Number.isInteger(quantity)||Number(quantity)<1||Number(quantity)>20)throw new Error("Invalid cart quantity.");
  map.set(productId,(map.get(productId)||0)+Number(quantity));
 }
 if([...map.values()].some(q=>q>20))throw new Error("Max 20 of each perfume per order.");
 return [...map].map(([productId,quantity])=>({productId,quantity}));
}

export async function calculateQuote(db:Db, input:{items:CartInput[];governorate:string;paymentMethod:PaymentMethod;couponCode?:string;userId?:string}){
 const [config,zone,products]=await Promise.all([
  db.storeSettings.findUnique({where:{id:"main"}}),
  db.shippingZone.findUnique({where:{code:input.governorate}}),
  db.product.findMany({where:{id:{in:input.items.map(x=>x.productId)},active:true,collection:{is:{active:true}}}}),
 ]);
 if(!zone||!zone.active)throw new Error("Delivery is not currently available to this governorate.");
 if(input.paymentMethod==="COD"&&!zone.codAvailable)throw new Error("Cash on delivery is not available for this governorate.");
 if(input.paymentMethod==="WALLET"&&!config?.walletNumber)throw new Error("Wallet payment is not configured.");
 if(input.paymentMethod==="INSTAPAY"&&!config?.instapayAddress)throw new Error("InstaPay payment is not configured.");
 if(products.length!==input.items.length)throw new Error("Some perfumes are no longer available.");
 const byId=new Map(input.items.map(x=>[x.productId,x.quantity]));
 for(const p of products){if(p.stock < byId.get(p.id)!)throw new Error(`Insufficient stock for ${p.name}.`);}
 const subtotal=products.reduce((v,p)=>v+p.price*byId.get(p.id)!,0);
 let coupon:Coupon|null=null,discount=0;
 const code=(input.couponCode||"").trim().toUpperCase();
 if(code){
  coupon=await db.coupon.findUnique({where:{code}});
  if(!coupon||!coupon.active||(coupon.expiresAt&&coupon.expiresAt<=new Date())||(coupon.startsAt&&coupon.startsAt>new Date())||(coupon.maxUses!==null&&coupon.usedCount>=coupon.maxUses)||subtotal<coupon.minSubtotal)throw new Error("Coupon is invalid, expired, exhausted, or the minimum spend was not met.");
  if(coupon.eligibleCollectionId&&!products.some(p=>p.collectionId===coupon!.eligibleCollectionId))throw new Error("Coupon is not valid for the selected products.");
  if(coupon.perCustomerLimit&&input.userId){
   const count=await db.order.count({where:{userId:input.userId,couponId:coupon.id,status:{not:"CANCELLED"}}});
   if(count>=coupon.perCustomerLimit)throw new Error("Coupon has reached the customer usage limit.");
  }
  const eligibleSubtotal=coupon.eligibleCollectionId?products.filter(p=>p.collectionId===coupon!.eligibleCollectionId).reduce((sum,p)=>sum+p.price*byId.get(p.id)!,0):subtotal;
  discount=Math.min(eligibleSubtotal,coupon.type==="PERCENT"?Math.floor(eligibleSubtotal*coupon.value/100):coupon.value,coupon.maxDiscount??Number.MAX_SAFE_INTEGER);
 }
 const discountedSubtotal=subtotal-discount;
 const freeThreshold=config?.freeShippingThreshold??3000;
 const shipping=(freeThreshold>0&&discountedSubtotal>=freeThreshold)?0:zone.fee;
 return {products,qtyById:byId,subtotal,discount,shipping,total:discountedSubtotal+shipping,coupon,zone,freeShippingThreshold:freeThreshold};
}

/** Hide unexpected database/provider details from customer-visible API responses. */
export function publicQuoteError(error:unknown){
 const message=error instanceof Error?error.message:"";
 const known=["Cart is empty", "Invalid cart", "Max 20", "Delivery is not", "Cash on delivery", "Wallet payment", "InstaPay payment", "Some perfumes", "Insufficient stock", "Coupon is", "Coupon has"];
 return known.some(prefix=>message.startsWith(prefix))?message:"The order could not be completed. Please try again.";
}
