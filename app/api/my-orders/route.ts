import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);
  try {
    const rows = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { items: { include: { product: { select: { name: true, imageUrl: true, size: true } } } } } });
    const orders = rows.map(order => ({
      ...order,
      status: order.status === "SHIPPED" || order.status === "DELIVERED" ? "PREPARING" : order.status,
      shippingStatus: order.status === "SHIPPED" ? "SHIPPED" : order.status === "DELIVERED" ? "DELIVERED" : order.shippingStatus,
      paymentStatus: order.paymentMethod === "COD" && order.paymentStatus === "PENDING" ? "AWAITING_COLLECTION" : order.paymentStatus,
    }));
    return NextResponse.json({ orders });
  } catch { return jsonError("Could not load orders", 503); }
}
