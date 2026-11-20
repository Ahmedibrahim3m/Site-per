import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { adminGate, jsonError } from "@/lib/api";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const denied = await adminGate(request);
  if (denied) return denied;
  const { id } = await params;
  const proof = await prisma.paymentProof.findFirst({ where: { orderId: id } });
  if (!proof) return jsonError("No payment proof is attached to this order", 404);

  const root = path.resolve(process.cwd(), "private_uploads", "payment-proofs");
  const filePath = path.resolve(proof.storagePath);
  if (!filePath.startsWith(root + path.sep)) return jsonError("Invalid stored proof path", 500);
  try {
    const bytes = await readFile(filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": proof.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": "inline; filename=payment-proof",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return jsonError("Stored payment proof is unavailable", 404);
  }
}
