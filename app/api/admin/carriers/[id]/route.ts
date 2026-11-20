import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError, safeString } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
function coverage(raw:unknown):string[]|null{
 if(!Array.isArray(raw)||raw.length>30||raw.some(v=>typeof v!=="string"||v.length>30)||new Set(raw).size!==raw.length)return null;
 return raw as string[];
}
function validOptionalUrl(value: string) {
  if (!value) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export async function PATCH(request: Request, { params }: Ctx) {
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
  if (name.length < 2 || typeof body.active !== "boolean" || typeof body.requiresTracking !== "boolean" || !validOptionalUrl(website) || !validOptionalUrl(trackingUrl)) return jsonError("Check shipping company details.");
  try {
    const carrier = await prisma.shippingCarrier.update({ where: { id: (await params).id }, data: { name, contactPhone, website, trackingUrl, notes, active: body.active, requiresTracking: body.requiresTracking, coverageZoneCodes:JSON.stringify(requestedZones) } });
    return NextResponse.json({ carrier });
  } catch { return jsonError("Shipping company not found or name already used", 409); }
}
