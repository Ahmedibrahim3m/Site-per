import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await adminGate(request);
  if (denied) return denied;
  try {
    const [totalCount, paymentReview,readyToShip,inTransit,rows]=await Promise.all([
      prisma.order.count(),
      prisma.order.count({where:{paymentStatus:"PROOF_SUBMITTED",status:{not:"CANCELLED"}}}),
      prisma.order.count({where:{status:"PREPARING",paymentStatus:"CONFIRMED",shippingStatus:"NOT_SHIPPED"}}),
      prisma.order.count({where:{shippingStatus:"IN_TRANSIT"}}),
      prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        user: { select: { id: true, name: true, email: true, username: true } },
        courier: true,
        paymentProof: { select: { id: true, mimeType: true, fileSize: true, uploadedAt: true, verifiedAt: true, verificationNote: true } },
        events: { orderBy: { createdAt: "asc" }, take: 100 },
        items: { include: { product: { select: { name: true, imageUrl: true, size: true } } } },
      },
    })
    ]);
    const orders = rows.map(order => ({
      ...order,
      // Older records stored shipping progress inside OrderStatus. Normalize them for the split-status UI.
      status: order.status === "SHIPPED" || order.status === "DELIVERED" ? "PREPARING" : order.status,
      shippingStatus: order.status === "SHIPPED" ? "SHIPPED" : order.status === "DELIVERED" ? "DELIVERED" : order.shippingStatus,
      paymentStatus: order.paymentMethod === "COD" && order.paymentStatus === "PENDING" ? "AWAITING_COLLECTION" : order.paymentStatus,
    }));
    return NextResponse.json({ orders,stats:{totalCount,paymentReview,readyToShip,inTransit} });
  } catch (error) {
    console.error("Admin orders load failed", error);
    return jsonError("Could not load orders", 503);
  }
}
