import { asInt, safeString, validImageUrl } from "@/lib/api";
export function parseProduct(body:Record<string,unknown>){
 const name=safeString(body.name,110);
 const nameAr=safeString(body.nameAr,110);
 const descriptionAr=safeString(body.descriptionAr,800);
 const notesAr=safeString(body.notesAr,350);
 const topNotesAr=safeString(body.topNotesAr,300);
 const heartNotesAr=safeString(body.heartNotesAr,300);
 const baseNotesAr=safeString(body.baseNotesAr,300);
 const description=safeString(body.description,800);
 const notes=safeString(body.notes,350);
 const imageUrl=safeString(body.imageUrl,1500);
 const size=safeString(body.size,50);
 const galleryRaw=typeof body.galleryImages==="string"?body.galleryImages:"";
 const galleryLines=galleryRaw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(galleryRaw.length>13000||galleryLines.length>8||galleryLines.some(url=>!validImageUrl(url)))return null;
 const galleryImages=JSON.stringify([...new Set(galleryLines.filter(url=>url!==imageUrl))]);
 const collectionId=safeString(body.collectionId,100);
 const price=asInt(body.price),stock=asInt(body.stock);
 const topNotes=safeString(body.topNotes,300);
 const heartNotes=safeString(body.heartNotes,300);
 const baseNotes=safeString(body.baseNotes,300);
 const concentration=safeString(body.concentration,70)||"Eau de Parfum";
 const customNotesRaw=typeof body.customNotes==="string"?body.customNotes:"[]";
 let customNotes:string;
 try{
  const parsed=JSON.parse(customNotesRaw);
  if(!Array.isArray(parsed)||parsed.length>12||parsed.some((row:any)=>!row||typeof row.label!=="string"||typeof row.value!=="string"||row.label.trim().length<1||row.label.length>60||row.value.length>300||(row.labelAr!==undefined&&typeof row.labelAr!=="string")||(row.valueAr!==undefined&&typeof row.valueAr!=="string")||(row.labelAr?.length||0)>60||(row.valueAr?.length||0)>300))return null;
  customNotes=JSON.stringify(parsed.map((row:any)=>({label:row.label.trim(),value:row.value.trim(),labelAr:typeof row.labelAr==="string"?row.labelAr.trim():"",valueAr:typeof row.valueAr==="string"?row.valueAr.trim():""})).filter((row:any)=>row.label&&row.value));
 }catch{return null;}
 const active=body.active;
 if(name.length<2||description.length>800||notes.length>350||!validImageUrl(imageUrl)||!size||!collectionId||price===null||price<1||price>10_000_000||stock===null||stock<0||stock>1_000_000||typeof active!=="boolean"||topNotes.length>300||heartNotes.length>300||baseNotes.length>300||concentration.length>70||customNotesRaw.length>5000)return null;
 return {name,nameAr:nameAr||null,description,descriptionAr:descriptionAr||null,notes,notesAr:notesAr||null,imageUrl,galleryImages,customNotes,size,collectionId,price,stock,active,topNotes,topNotesAr:topNotesAr||null,heartNotes,heartNotesAr:heartNotesAr||null,baseNotes,baseNotesAr:baseNotesAr||null,concentration};
}
export function parseCollection(body:Record<string,unknown>){
 const name=safeString(body.name,100);
 const nameAr=safeString(body.nameAr,100);
 const descriptionAr=safeString(body.descriptionAr,400);
 const description=safeString(body.description,400);
 const imageUrl=safeString(body.imageUrl,1500);
 const sortOrder=asInt(body.sortOrder);
 if(name.length<2||sortOrder===null||sortOrder<0||sortOrder>10000||typeof body.active!=="boolean"||(imageUrl&&!validImageUrl(imageUrl)))return null;
 return {name,nameAr:nameAr||null,description,descriptionAr:descriptionAr||null,imageUrl:imageUrl||null,sortOrder,active:body.active};
}
