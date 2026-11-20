import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 try{
   const [collections,settings,shippingZones]=await Promise.all([
     prisma.collection.findMany({where:{active:true},orderBy:{sortOrder:"asc"},include:{products:{where:{active:true},orderBy:{name:"asc"}}}}),
     prisma.storeSettings.findUnique({where:{id:"main"}}),
     prisma.shippingZone.findMany({where:{active:true},orderBy:{name:"asc"},select:{code:true,name:true,fee:true,codAvailable:true,etaDays:true}})
   ]);
   return NextResponse.json({collections,shippingZones,settings:settings||{brandName:"NOIRÉ",whatsappNumber:"",walletNumber:"",instapayAddress:"",shippingFee:75,freeShippingThreshold:3000,heroImageUrl:"https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1800&q=85",storyImageUrl:"https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85",instagramUrl:"https://www.instagram.com/",heroTagline:"The Art of Quiet Luxury.",heroDescription:"Timeless fragrances crafted with intention, designed to be felt, never announced.",storyHeadline:"More than a fragrance. A feeling.",storyDescription:"We believe fragrance is the most personal form of expression. A beautiful scent creates memories that remain long after the moment has passed."}});
 }catch(e){console.error("Catalog error",e);return NextResponse.json({error:"Catalog is unavailable. Run Setup.bat and check your local database."},{status:503});}
}
