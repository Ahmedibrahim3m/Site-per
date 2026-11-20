import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError, asInt, safeString } from "@/lib/api";
import { validateStoreSettings, type StoreSettings } from "@/lib/store-settings-validation";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const denied = await adminGate(req); if (denied) return denied;
  try { return NextResponse.json({ settings: await prisma.storeSettings.findUnique({ where: { id: "main" } }) }); }
  catch { return NextResponse.json({ error: "Unable to load settings", code: "DATABASE_ERROR" }, { status: 503 }); }
}
export async function PATCH(req: Request) {
  const denied = await adminGate(req); if (denied) return denied;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body", code: "BAD_REQUEST" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("Invalid settings payload");
  const b = body as Record<string, unknown>;
  const shippingFee = asInt(b.shippingFee), freeShippingThreshold = asInt(b.freeShippingThreshold);
  const values = {
    heroImageUrl: safeString(b.heroImageUrl, 1500), storyImageUrl: safeString(b.storyImageUrl, 1500),
    heroPositionX: asInt(b.heroPositionX) ?? NaN,heroPositionY: asInt(b.heroPositionY) ?? NaN,storyPositionX: asInt(b.storyPositionX) ?? NaN,storyPositionY: asInt(b.storyPositionY) ?? NaN,
    instagramUrl: safeString(b.instagramUrl, 1500), facebookUrl: safeString(b.facebookUrl, 1500), tiktokUrl: safeString(b.tiktokUrl, 1500), brandName: safeString(b.brandName, 80),
    whatsappNumber: safeString(b.whatsappNumber, 25).replace(/\D/g, ""),
    walletNumber: safeString(b.walletNumber, 20).replace(/\D/g, ""),
    instapayAddress: safeString(b.instapayAddress, 120),
    heroTagline: safeString(b.heroTagline, 110), heroDescription: safeString(b.heroDescription, 350),
    heroTaglineAr: safeString(b.heroTaglineAr, 110), heroDescriptionAr: safeString(b.heroDescriptionAr, 350),
    storyHeadline: safeString(b.storyHeadline, 110), storyDescription: safeString(b.storyDescription, 350),
    storyHeadlineAr: safeString(b.storyHeadlineAr, 110), storyDescriptionAr: safeString(b.storyDescriptionAr, 350),
    shippingPolicy: safeString(b.shippingPolicy, 4000), returnsPolicy: safeString(b.returnsPolicy, 4000),
    shippingPolicyAr: safeString(b.shippingPolicyAr, 4000), returnsPolicyAr: safeString(b.returnsPolicyAr, 4000), privacyPolicyAr: safeString(b.privacyPolicyAr, 4000),
    privacyPolicy: safeString(b.privacyPolicy, 4000),
    shippingFee: shippingFee ?? NaN, freeShippingThreshold: freeShippingThreshold ?? NaN
  } satisfies StoreSettings;
  const fieldErrors = validateStoreSettings(values);
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ error: "Please correct the highlighted settings.", code: "VALIDATION_ERROR", fieldErrors }, { status: 422 });
  }
  try {
    const settings = await prisma.storeSettings.upsert({
      where: { id: "main" }, create: { id: "main", ...values }, update: { ...values }
    });
    return NextResponse.json({ settings });
  } catch {
    // Do not leak database state, credentials or payment details to browser or logs.
    return NextResponse.json({ error: "Settings could not be saved. Check the database and try again.", code: "DATABASE_ERROR" }, { status: 503 });
  }
}
