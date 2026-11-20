"use client";
import {useLanguage} from "@/components/language-provider";
export default function AddToBag({productId,disabled}:{productId:string;disabled:boolean}){
 const {t}=useLanguage();
 return <button className="btn btn-dark" disabled={disabled} onClick={()=>{try{const data=JSON.parse(localStorage.getItem("noire-cart-v2")||"[]");const cart:Array<{productId:string;quantity:number}>=Array.isArray(data)?data:[];const current=cart.find(i=>i.productId===productId);if(current)current.quantity=Math.min(current.quantity+1,20);else cart.push({productId,quantity:1});localStorage.setItem("noire-cart-v2",JSON.stringify(cart));window.location.assign("/?bag=1");}catch{window.location.assign("/#shop");}}}>{t(disabled?"SOLD OUT":"ADD TO BAG")} →</button>;
}
