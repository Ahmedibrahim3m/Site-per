import type {DiscountType} from "@prisma/client";
export function parseCoupon(value:unknown){
 if(!value||typeof value!=="object")return null;
 const b=value as Record<string,unknown>;
 const code=typeof b.code==="string"?b.code.trim().toUpperCase():"";
 const type=b.type;
 const amount=b.value,minSubtotal=b.minSubtotal,maxUses=b.maxUses;
 const expiresAt=b.expiresAt?new Date(String(b.expiresAt)):null;
 const startsAt=b.startsAt?new Date(String(b.startsAt)):null;
 const maxDiscount=b.maxDiscount===undefined||b.maxDiscount===null?null:Number(b.maxDiscount);
 const perCustomerLimit=b.perCustomerLimit===undefined||b.perCustomerLimit===null?null:Number(b.perCustomerLimit);
 const eligibleCollectionId=typeof b.eligibleCollectionId==="string"?b.eligibleCollectionId.trim()||null:null;
 if(!/^[A-Z0-9_-]{3,24}$/.test(code)||(type!=="PERCENT"&&type!=="FIXED")||typeof amount!=="number"||!Number.isSafeInteger(amount)||amount<1||amount>(type==="PERCENT"?100:10000000)||typeof minSubtotal!=="number"||!Number.isSafeInteger(minSubtotal)||minSubtotal<0||minSubtotal>10000000||(maxUses!==null&&(typeof maxUses!=="number"||!Number.isSafeInteger(maxUses)||maxUses<1||maxUses>1000000))||typeof b.active!=="boolean"||(expiresAt&&Number.isNaN(expiresAt.getTime()))||(startsAt&&Number.isNaN(startsAt.getTime()))||(expiresAt&&startsAt&&startsAt>=expiresAt)||(maxDiscount!==null&&(!Number.isSafeInteger(maxDiscount)||maxDiscount<1||maxDiscount>10000000))||(perCustomerLimit!==null&&(!Number.isSafeInteger(perCustomerLimit)||perCustomerLimit<1||perCustomerLimit>1000000))||(eligibleCollectionId!==null&&eligibleCollectionId.length>100))return null;
 return {code,type:type as DiscountType,value:amount,minSubtotal,maxUses:maxUses as number|null,expiresAt,startsAt,maxDiscount,perCustomerLimit,eligibleCollectionId,active:b.active};
}
