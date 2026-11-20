import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGate, jsonError } from "@/lib/api";
export async function POST(request: Request) {
  const denied = await adminGate(request);
  if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("Invalid JSON"); }
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length > 200 || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length) return jsonError("Provide a valid collection order.");
  try {
    const existing = await prisma.collection.findMany({ where: { id: { in: ids as string[] } }, select: { id: true } });
    if (existing.length !== ids.length) return jsonError("One or more collections could not be found.", 404);
    await prisma.$transaction(ids.map((id, index) => prisma.collection.update({ where: { id: id as string }, data: { sortOrder: index } })));
    return NextResponse.json({ ok: true });
  } catch { return jsonError("Could not save collection order", 503); }
}
