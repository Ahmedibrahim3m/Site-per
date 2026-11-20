import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { products as samples } from "../lib/legacy-products";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();
async function main(){
  const username=(process.env.SEED_ADMIN_USERNAME||"admin").trim().toLowerCase();
  const password=process.env.SEED_ADMIN_PASSWORD;
  if(!password || password.length<8) throw new Error("Set SEED_ADMIN_PASSWORD (8+ characters) in .env before setup.");
  const existingAdmin=await prisma.user.findFirst({where:{role:Role.ADMIN}});
  if(!existingAdmin){
    await prisma.user.create({data:{username,name:"NOIRÉ Administrator",passwordHash:await hashPassword(password),role:Role.ADMIN}});
    console.log(`Created the single administrator: ${username}. Change this DEMO password before publishing.`);
  }else{
    console.log(`Existing administrator ${existingAdmin.username} preserved; setup did NOT reset its password.`);
  }
  const collections=[
    {slug:"signature",name:"Signature Collection",description:"Our most expressive, unforgettable fragrances.",imageUrl:samples[0]?.image},
    {slug:"for-her",name:"For Her",description:"Soft florals, luminous warmth and lasting elegance.",imageUrl:samples.find(p=>p.category==="For Her")?.image},
    {slug:"for-him",name:"For Him",description:"Bold, refined scents with distinctive character.",imageUrl:samples.find(p=>p.category==="For Him")?.image},
    {slug:"unisex",name:"Unisex",description:"Intuitive fragrances without boundaries.",imageUrl:samples.find(p=>p.category==="Unisex")?.image},
  ];
  for(let i=0;i<collections.length;i++){
    const c=collections[i];
    await prisma.collection.upsert({where:{slug:c.slug},update:{},create:{...c,sortOrder:i}});
  }
  for(const p of samples){
    const slug=p.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
    const collectionSlug=p.brand.toLowerCase().includes("signature")?"signature":p.category==="For Her"?"for-her":p.category==="For Him"?"for-him":"unisex";
    const col=await prisma.collection.findUniqueOrThrow({where:{slug:collectionSlug}});
    await prisma.product.upsert({where:{slug},update:{},create:{slug,name:p.name,description:p.description,notes:p.notes,imageUrl:p.image,price:p.price,size:p.size,stock:p.stock??10,collectionId:col.id}});
  }
  const governorates = [
    ["alexandria","Alexandria"],["cairo","Cairo"],["giza","Giza"],["qalyubia","Qalyubia"],
    ["beheira","Beheira"],["dakahlia","Dakahlia"],["gharbia","Gharbia"],["menoufia","Menoufia"],
    ["sharqia","Sharqia"],["kafr-el-sheikh","Kafr El Sheikh"],["damietta","Damietta"],
    ["port-said","Port Said"],["ismailia","Ismailia"],["suez","Suez"],["north-sinai","North Sinai"],
    ["south-sinai","South Sinai"],["fayoum","Fayoum"],["beni-suef","Beni Suef"],["minya","Minya"],
    ["assiut","Assiut"],["sohag","Sohag"],["qena","Qena"],["luxor","Luxor"],["aswan","Aswan"],
    ["red-sea","Red Sea"],["new-valley","New Valley"],["matrouh","Matrouh"]
  ];
  for (const [code,name] of governorates){
    await prisma.shippingZone.upsert({where:{code},update:{},create:{code,name,fee:75,active:true,codAvailable:true,etaDays:4}});
  }
  await prisma.storeSettings.upsert({where:{id:"main"},update:{},create:{
    id:"main",brandName:process.env.NEXT_PUBLIC_STORE_NAME||"NOIRÉ",
    whatsappNumber:process.env.NEXT_PUBLIC_WHATSAPP_NUMBER||"",
    walletNumber:process.env.NEXT_PUBLIC_WALLET_NUMBER||"",
    instapayAddress:process.env.NEXT_PUBLIC_INSTAPAY_ADDRESS||""
  }});
  console.log(`Seed OK: ${collections.length} collections, ${samples.length} demo perfumes. Admin: 1 only.`);
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
