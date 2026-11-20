import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Ctx={params:Promise<{filename:string}>};
export async function GET(_req:Request,{params}:Ctx){
 const {filename}=await params;
 if(!/^noire-\d+-[a-f0-9]{16}\.(png|jpg|webp)$/.test(filename))return NextResponse.json({error:"Not found"},{status:404});
 const extension=filename.split(".").pop();
 const type=extension==="png"?"image/png":extension==="webp"?"image/webp":"image/jpeg";
 try{
  const content=await readFile(path.join(process.cwd(),"public","uploads",filename));
  return new NextResponse(new Blob([new Uint8Array(content)],{type}),{headers:{"Content-Type":type,"Cache-Control":"public, max-age=3600","X-Content-Type-Options":"nosniff"}});
 }catch{return NextResponse.json({error:"Not found"},{status:404});}
}
