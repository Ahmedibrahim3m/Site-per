import {NextResponse} from "next/server";
import {adminGate,jsonError} from "@/lib/api";
import {isSameOrigin} from "@/lib/auth";
import {notifyAdministrators} from "@/lib/push";
export async function POST(req:Request){if(!isSameOrigin(req))return jsonError("Invalid origin",403);const denied=await adminGate(req);if(denied)return denied;await notifyAdministrators("SYSTEM","NOIRÉ Test Notification","This is a test alert from your Admin Notification Center.");return NextResponse.json({ok:true,message:"Test delivery attempted."});}
