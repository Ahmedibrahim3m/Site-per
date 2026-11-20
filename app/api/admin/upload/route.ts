import { NextResponse } from "next/server";
import { adminGate, jsonError } from "@/lib/api";
import { randomBytes } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
export const runtime="nodejs";
const MAX_IMAGE_BYTES=5*1024*1024;
export async function POST(req:Request){
 const denied=await adminGate(req);if(denied)return denied;
 let data:FormData;try{data=await req.formData()}catch{return jsonError("Invalid upload");}
 const image=data.get("image");
 if(!(image instanceof File))return jsonError("Choose an image");
 if(image.size===0||image.size>MAX_IMAGE_BYTES)return jsonError("Image must be 5 MB or smaller");
 const buffer=Buffer.from(await image.arrayBuffer());
 const png=buffer.length>8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpg=buffer.length>3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
 const webp=buffer.length>12&&buffer.toString("ascii",0,4)==="RIFF"&&buffer.toString("ascii",8,12)==="WEBP";
 const ext=png?"png":jpg?"jpg":webp?"webp":null;
 if(!ext)return jsonError("Only valid PNG, JPEG and WEBP images are accepted");
 const expected=png?"image/png":jpg?"image/jpeg":"image/webp";
 if(image.type&&image.type!==expected)return jsonError("Image content does not match its declared file type");
 const filename=`noire-${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
 const folder=path.join(process.cwd(),"public","uploads");
 try{
  await mkdir(folder,{recursive:true});
  await writeFile(path.join(folder,filename),buffer,{flag:"wx"});
  return NextResponse.json({imageUrl:`/api/media/${filename}`},{status:201});
 }catch(e){console.error("Upload failed",e);return jsonError("Could not store image; use an HTTPS image URL on this hosting platform.",503);}
}
