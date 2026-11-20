import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError, safeString } from "@/lib/api";

export const dynamic = "force-dynamic";
function coverage(raw:unknown):string[]|null{
 if(!Array.isArray(raw)||raw.length>30||raw.some(v=>typeof v!=="string"||v.length>30)||new Set(raw).size!==raw.length)return null;
 return raw as string[];
}
function validOptionalUrl(value: string) {
  if (!value) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export async function GET(request: Request) {
  const denied = await adminGate(request);
  if (denied) return denied;
  try {
    const carriers = await prisma.shippingCarrier.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
    return NextResponse.json({ carriers });
  } catch { return jsonError("Could not load shipping companies", 503); }
}

export async function POST(request: Request) {
  const denied = await adminGate(request);
  if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("Invalid JSON"); }
  const name = safeString(body.name, 100);
  const contactPhone = safeString(body.contactPhone, 25);
  const website = safeString(body.website, 300);
  const trackingUrl = safeString(body.trackingUrl, 500);
  const notes = safeString(body.notes, 500);
  const requestedZones = coverage(body.coverageZones ?? []);
  if(requestedZones===null)return jsonError("Invalid governorate coverage selection.");
  const realZones=await prisma.shippingZone.count({where:{code:{in:requestedZones}}});
  if(realZones!==requestedZones.length)return jsonError("Select only existing shipping zones.");
  const requiresTracking = body.requiresTracking !== false;
  const active = body.active !== false;
  if (name.length < 2 || !validOptionalUrl(website) || !validOptionalUrl(trackingUrl)) return jsonError("Enter a valid company name and HTTPS website/tracking links.");
  try {
    const carrier = await prisma.shippingCarrier.create({ data: { name, contactPhone, website, trackingUrl, notes, requiresTracking, active, coverageZoneCodes:JSON.stringify(requestedZones) } });
    return NextResponse.json({ carrier }, { status: 201 });
  } catch { return jsonError("A shipping company with this name may already exist.", 409); }
}
