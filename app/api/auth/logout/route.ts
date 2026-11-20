import { NextResponse } from "next/server";
import { clearSession, isSameOrigin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
export async function POST(req:Request){
 if(!isSameOrigin(req))return jsonError("Invalid request origin",403);
 await clearSession();
 return NextResponse.json({ok:true});
}
