import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser, isSameOrigin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
type Ctx = { params: Promise<{ reference: string }> };
export async function PATCH(request: Request, { params }: Ctx) {
  if (!isSameOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in required", 401);
  let value: unknown;
  try { value = await request.json(); } catch { return jsonError("Invalid JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return jsonError("Invalid request body");
  const reference = String((value as Record<string, unknown>).paymentReference ?? "").trim();
  if (!/^[\w\s.\/-]{5,90}$/.test(reference)) return jsonError("Enter a valid transaction reference (5–90 characters).");
  const { reference: orderRef } = await params;
  try {
    const order = await prisma.$transaction(async tx => {
      const existing = await tx.order.findFirst({ where: { reference: orderRef, userId: user.id, paymentMethod: { in: ["INSTAPAY", "WALLET"] }, paymentStatus: { in: ["PENDING", "PROOF_SUBMITTED"] }, status: { not: "CANCELLED" } } });
      if (!existing) throw new Error("Order not found or not awaiting transfer verification.");
      const updated = await tx.order.update({ where: { id: existing.id }, data: { paymentReference: reference } });
      await tx.orderEvent.create({ data: { orderId: existing.id, actorUserId: user.id, actorLabel: user.name, eventType: "PAYMENT_REFERENCE_SUBMITTED", fromValue: existing.paymentReference, toValue: reference, note: "Customer added a transaction reference for manual payment review." } });
      const admins = await tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
      for (const admin of admins) await tx.notification.create({ data: { userId: admin.id, orderId: existing.id, title: "Transfer reference added", message: `${existing.reference} · ${reference}`, kind: "PAYMENT_UPDATE" } });
      return updated;
    });
    return NextResponse.json({ ok: true, message: "Reference saved. This does not confirm receipt of payment.", order });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save reference", 404);
  }
}
