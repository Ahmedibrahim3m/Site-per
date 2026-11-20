import { NextResponse,after } from "next/server";
import {notifyAdministrators} from "@/lib/push";
import { prisma } from "@/lib/db";
import { adminGate, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { OrderStatus, PaymentStatus, ShippingStatus, Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };
const orderStatuses = ["PENDING", "CONFIRMED", "PREPARING", "CANCELLED"];
const paymentStatuses = Object.values(PaymentStatus) as string[];
const shippingStatuses = Object.values(ShippingStatus) as string[];

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await adminGate(request);
  if (denied) return denied;
  const actor = await getCurrentUser();
  if (!actor) return jsonError("Please log in", 401);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("Invalid JSON"); }
  const status = String(body.status ?? "");
  const paymentStatus = String(body.paymentStatus ?? "");
  const shippingStatus = String(body.shippingStatus ?? "NOT_SHIPPED");
  const courierId = typeof body.courierId === "string" && body.courierId ? body.courierId : null;
  const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";
  const paymentReference = typeof body.paymentReference === "string" ? body.paymentReference.trim() : "";
  const verificationNote = typeof body.verificationNote === "string" ? body.verificationNote.trim().slice(0, 300) : "";

  if (!orderStatuses.includes(status) || !paymentStatuses.includes(paymentStatus) || !shippingStatuses.includes(shippingStatus)) return jsonError("Invalid order, payment or shipping status");
  if (trackingNumber.length > 100 || paymentReference.length > 90) return jsonError("Tracking or payment reference is too long");
  if (paymentReference && !/^[\w\s.\/-]{5,90}$/.test(paymentReference)) return jsonError("Invalid payment reference");

  const { id } = await params;
  try {
    const order = await prisma.$transaction(async tx => {
      const original = await tx.order.findUnique({ where: { id }, include: { items: true, paymentProof: true, courier: true } });
      if (!original) throw new Error("Order not found");

      const oldShippingStatus = original.status === "SHIPPED" ? "SHIPPED" : original.status === "DELIVERED" ? "DELIVERED" : original.shippingStatus;
      if (original.status === "CANCELLED" && status !== "CANCELLED") throw new Error("Cancelled orders cannot be reopened; create a new order instead.");
      if (original.status !== "CANCELLED" && status === "CANCELLED" && oldShippingStatus !== "NOT_SHIPPED") throw new Error("An order cannot be cancelled after it has been handed to the courier.");
      if (original.status !== "CANCELLED" && status === "CANCELLED" && original.paymentStatus === "CONFIRMED" && paymentStatus !== "REFUNDED") throw new Error("Mark the confirmed payment as Refunded before completing cancellation.");

      const carrier = courierId ? await tx.shippingCarrier.findUnique({ where: { id: courierId } }) : null;
      if (courierId && !carrier) throw new Error("Select a valid shipping company.");
      if (courierId && !carrier?.active && original.courierId !== courierId) throw new Error("This shipping company is inactive and cannot be assigned to a new shipment.");
      const enteringDispatch = oldShippingStatus === "NOT_SHIPPED" && (shippingStatus === "SHIPPED" || shippingStatus === "IN_TRANSIT");
      if (enteringDispatch && !courierId && !original.courierId) throw new Error("Select a shipping company before dispatching the order.");
      if (enteringDispatch && (carrier?.requiresTracking ?? original.courier?.requiresTracking ?? true) && !trackingNumber && !original.trackingNumber) throw new Error("Enter the courier tracking number before dispatching.");
      if (shippingStatus === "DELIVERED" && oldShippingStatus !== "SHIPPED" && oldShippingStatus !== "IN_TRANSIT" && oldShippingStatus !== "DELIVERED") throw new Error("Mark the order as shipped or in transit before marking it delivered.");
      if (shippingStatus !== "NOT_SHIPPED" && (status === "PENDING" || status === "CANCELLED")) throw new Error("Confirm and prepare the order before changing its shipping status.");

      const isCod = original.paymentMethod === "COD";
      if (isCod && ["PENDING", "PROOF_SUBMITTED"].includes(paymentStatus)) throw new Error("Cash on delivery orders should remain Awaiting Collection until the courier collects the payment.");
      if (!isCod && paymentStatus === "AWAITING_COLLECTION") throw new Error("Awaiting Collection is only valid for cash on delivery orders.");
      if (paymentStatus === "CONFIRMED" && original.status === "CANCELLED") throw new Error("A cancelled order cannot be marked paid.");
      if (paymentStatus === "CONFIRMED" && isCod && shippingStatus !== "DELIVERED") throw new Error("Confirm COD payment only after the order is marked delivered and the amount has been collected.");
      if (paymentStatus === "CONFIRMED" && !isCod && !original.paymentProof) throw new Error("A transfer receipt must be attached before confirming an electronic payment.");
      if (!isCod && ["CONFIRMED", "PREPARING"].includes(status) && paymentStatus !== "CONFIRMED") throw new Error("Verify the InstaPay or wallet receipt before confirming or preparing this order.");
      if (paymentStatus === "REFUNDED" && original.paymentStatus !== "CONFIRMED") throw new Error("Only a previously confirmed payment can be marked refunded.");

      if (original.status !== "CANCELLED" && status === "CANCELLED") {
        for (const line of original.items) await tx.product.update({ where: { id: line.productId }, data: { stock: { increment: line.quantity } } });
        if (original.couponId) await tx.coupon.update({ where: { id: original.couponId }, data: { usedCount: { decrement: 1 } } });
      }

      const next = await tx.order.update({
        where: { id },
        data: {
          status: status as OrderStatus,
          paymentStatus: paymentStatus as PaymentStatus,
          shippingStatus: shippingStatus as ShippingStatus,
          courierId,
          courierName: carrier?.name ?? (courierId ? null : original.courierId ? null : original.courierName),
          trackingNumber: trackingNumber || null,
          paymentReference: paymentReference || original.paymentReference,
        },
      });

      const changes: { type: string; from: string | null; to: string | null; note: string }[] = [];
      const oldOrderStatus = original.status === "SHIPPED" || original.status === "DELIVERED" ? "PREPARING" : original.status;
      if (oldOrderStatus !== status) changes.push({ type: "ORDER_STATUS", from: oldOrderStatus, to: status, note: `Order status changed to ${status}.` });
      if (original.paymentStatus !== paymentStatus) changes.push({ type: "PAYMENT_STATUS", from: original.paymentStatus, to: paymentStatus, note: paymentStatus === "CONFIRMED" ? "Payment was manually verified by an administrator." : `Payment status changed to ${paymentStatus}.` });
      if (oldShippingStatus !== shippingStatus) changes.push({ type: "SHIPPING_STATUS", from: oldShippingStatus, to: shippingStatus, note: `Shipping status changed to ${shippingStatus}.` });
      if (original.courierId !== courierId) changes.push({ type: "COURIER_ASSIGNED", from: original.courierName, to: carrier?.name ?? null, note: "Shipping company assignment updated." });
      if (original.trackingNumber !== (trackingNumber || null)) changes.push({ type: "TRACKING_UPDATED", from: original.trackingNumber, to: trackingNumber || null, note: "Courier tracking reference updated." });
      if (original.paymentReference !== (paymentReference || original.paymentReference)) changes.push({ type: "PAYMENT_REFERENCE", from: original.paymentReference, to: paymentReference, note: "Customer transfer reference updated by admin." });

      for (const change of changes) {
        await tx.orderEvent.create({ data: { orderId: id, actorUserId: actor.id, actorLabel: actor.name, eventType: change.type, fromValue: change.from, toValue: change.to, note: change.note } });
      }
      if (original.paymentProof && (verificationNote || paymentStatus === "CONFIRMED") && (verificationNote !== (original.paymentProof.verificationNote || "") || (paymentStatus === "CONFIRMED" && !original.paymentProof.verifiedAt))) {
        await tx.paymentProof.update({ where: { id: original.paymentProof.id }, data: {
          verificationNote: verificationNote || original.paymentProof.verificationNote,
          ...(paymentStatus === "CONFIRMED" ? { verifiedAt: original.paymentProof.verifiedAt ?? new Date(), verifiedById: original.paymentProof.verifiedById ?? actor.id, verificationNote: verificationNote || "Verified manually by NOIRÉ administrator." } : {}),
        } });
        if (verificationNote && verificationNote !== (original.paymentProof.verificationNote || "")) {
          await tx.orderEvent.create({ data: { orderId: id, actorUserId: actor.id, actorLabel: actor.name, eventType: "PAYMENT_REVIEW_NOTE", fromValue: original.paymentProof.verificationNote, toValue: verificationNote, note: "Administrator updated the payment review note." } });
        }
      }
      if (changes.length) {
        const parts = changes.map(change => change.note);
        await tx.notification.create({ data: { userId: original.userId, orderId: id, title: "Your order was updated", message: `${original.reference}: ${parts.join(" ")}`, kind: "ORDER_UPDATE" } });
      }
      return next;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if(order.shippingStatus!=="NOT_SHIPPED")after(()=>notifyAdministrators("SHIPPING","Shipping status updated",`Order ${order.reference}: ${order.shippingStatus.replaceAll("_"," ")}.`,"/admin?tab=orders"));
    return NextResponse.json({ order });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update order", 409);
  }
}
