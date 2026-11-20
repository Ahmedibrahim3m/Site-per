import { prisma } from "@/lib/db";
import { NextResponse,after } from "next/server";
import {notifyAdministrators} from "@/lib/push";
import { randomUUID } from "node:crypto";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { getCurrentUser, isSameOrigin } from "@/lib/auth";
import { cleanCart, calculateQuote, EGYPT_PHONE, PAYMENT_METHODS, publicQuoteError } from "@/lib/pricing";
import { jsonError } from "@/lib/api";
import { tooManyAttempts } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in before placing an order", 401);
  if (tooManyAttempts(`order-create:${user.id}`, 5, 10 * 60_000)) return jsonError("Too many order attempts. Please wait a few minutes and try again.", 429);

  let value: unknown;
  try { value = await request.json(); } catch { return jsonError("Invalid JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return jsonError("Invalid request body");
  const body = value as Record<string, unknown>;

  const customerName = String(body.customerName ?? "").trim();
  const phone = String(body.phone ?? "").replace(/[\s-]/g, "");
  const governorate = String(body.governorate ?? "").trim();
  const area = String(body.area ?? "").trim();
  const address = String(body.address ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const method = String(body.paymentMethod ?? "");
  const couponCode = String(body.couponCode ?? "").trim().toUpperCase();
  const paymentReference = String(body.paymentReference ?? "").trim();
  const proofToken = typeof body.paymentProofToken === "string" ? body.paymentProofToken : "";

  if (
    customerName.length < 2 || customerName.length > 120 || !EGYPT_PHONE.test(phone) ||
    governorate.length < 2 || governorate.length > 100 || area.length < 2 || area.length > 120 ||
    address.length < 8 || address.length > 500 || notes.length > 500 ||
    !PAYMENT_METHODS.has(method) || couponCode.length > 30 || paymentReference.length > 90 ||
    (paymentReference && !/^[\w\s.\/-]{5,90}$/.test(paymentReference))
  ) return jsonError("Check your contact, area, delivery address, coupon and payment method.");

  if (method === "COD" && proofToken) return jsonError("Cash on delivery does not require a payment receipt.");
  if (method !== "COD" && !/^[a-f0-9]{64}$/.test(proofToken)) return jsonError("Upload your InstaPay or wallet transfer receipt before placing the order.");

  let items;
  try { items = cleanCart(body.items); } catch (error) { return jsonError((error as Error).message); }

  try {
    const order = await prisma.$transaction(async tx => {
      const quote = await calculateQuote(tx, { items, governorate, paymentMethod: method as PaymentMethod, couponCode, userId:user.id });
      let proof: { id: string } | null = null;
      if (method !== "COD") {
        proof = await tx.paymentProof.findFirst({
          where: { token: proofToken, userId: user.id, orderId: null, expiresAt: { gt: new Date() } },
          select: { id: true },
        });
        if (!proof) throw new Error("Your payment receipt upload expired or is invalid. Please upload it again.");
      }

      for (const product of quote.products) {
        const quantity = quote.qtyById.get(product.id)!;
        const updated = await tx.product.updateMany({ where: { id: product.id, active: true, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
        if (updated.count !== 1) throw new Error(`Insufficient stock for ${product.name}.`);
      }

      if (quote.coupon) {
        const coupon = quote.coupon;
        const updated = await tx.coupon.updateMany({
          where: { id: coupon.id, active: true, usedCount: coupon.maxUses === null ? { gte: 0 } : { lt: coupon.maxUses } },
          data: { usedCount: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Error("Coupon has reached its usage limit.");
      }

      const created = await tx.order.create({
        data: {
          reference: `NR-${randomUUID().slice(0, 10).toUpperCase()}`,
          userId: user.id,
          customerName,
          phone,
          governorate: quote.zone.name,
          area,
          address,
          notes,
          paymentReference: paymentReference || null,
          paymentMethod: method as PaymentMethod,
          paymentStatus: method === "COD" ? "AWAITING_COLLECTION" : "PROOF_SUBMITTED",
          status: "PENDING",
          shippingStatus: "NOT_SHIPPED",
          subtotal: quote.subtotal,
          discount: quote.discount,
          shipping: quote.shipping,
          total: quote.total,
          couponId: quote.coupon?.id,
          items: { create: quote.products.map(product => ({ productId: product.id, quantity: quote.qtyById.get(product.id)!, unitPrice: product.price })) },
        },
      });

      if (proof) {
        await tx.paymentProof.update({ where: { id: proof.id }, data: { orderId: created.id, expiresAt: null } });
      }

      await tx.orderEvent.create({
        data: { orderId: created.id, actorUserId: user.id, actorLabel: user.name, eventType: "ORDER_CREATED", toValue: "PENDING", note: method === "COD" ? "Order placed with cash on delivery." : "Order placed and payment receipt uploaded; manual verification is pending." },
      });
      if (method !== "COD") {
        await tx.orderEvent.create({ data: { orderId: created.id, actorUserId: user.id, actorLabel: user.name, eventType: "PAYMENT_PROOF_SUBMITTED", toValue: "PROOF_SUBMITTED", note: "Customer uploaded a transfer receipt for manual review." } });
      }
      await tx.notification.create({ data: { userId: user.id, orderId: created.id, title: "Order received", message: `Your NOIRÉ order ${created.reference} has been received.`, kind: "ORDER" } });
      const admins = await tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
      for (const admin of admins) {
        await tx.notification.create({ data: { userId: admin.id, orderId: created.id, title: "New order received", message: `${created.reference} · ${customerName} · ${created.total.toLocaleString("en-EG")} EGP`, kind: "NEW_ORDER" } });
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    after(()=>notifyAdministrators("NEW_ORDER","New order received",`Order ${order.reference} · ${order.total.toLocaleString("en-EG")} EGP`,"/admin?tab=orders"));
    if(method!=="COD")after(()=>notifyAdministrators("PAYMENT_UPDATE","Payment proof submitted",`Order ${order.reference} needs manual payment verification.`,"/admin?tab=orders"));
    return NextResponse.json({ reference: order.reference, total: order.total, paymentStatus: order.paymentStatus, status: order.status, shippingStatus: order.shippingStatus }, { status: 201 });
  } catch (error) {
    console.error("Order placement failed", error);
    const message = error instanceof Error && error.message.startsWith("Your payment receipt") ? error.message : publicQuoteError(error);
    return jsonError(message, 409);
  }
}
