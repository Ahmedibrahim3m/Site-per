import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isSameOrigin } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30, include: { order: { select: { reference: true } } } });
  return NextResponse.json({ notifications, unreadCount: notifications.filter(n => !n.readAt).length });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("Invalid JSON"); }
  if (body.markAll === true) {
    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ ok: true });
  }
  if (typeof body.id !== "string") return jsonError("Notification ID is required");
  const result = await prisma.notification.updateMany({ where: { id: body.id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return result.count ? NextResponse.json({ ok: true }) : jsonError("Notification not found", 404);
}
