import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getCurrentUser, isSameOrigin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { tooManyAttempts } from "@/lib/rate-limit";

export const runtime = "nodejs";
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TTL_MS = 24 * 60 * 60 * 1000;

function detectImage(buffer: Buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in before uploading payment proof", 401);
  if (tooManyAttempts(`payment-proof:${user.id}`, 10, 60 * 60_000)) return jsonError("Too many receipt uploads. Please try again later.", 429);

  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError("Invalid upload form"); }
  const file = form.get("image");
  if (!(file instanceof File)) return jsonError("Choose a payment receipt image");
  if (file.size < 1 || file.size > MAX_PROOF_BYTES) return jsonError("Payment proof must be an image up to 5 MB");

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectImage(buffer);
  if (!mimeType || (file.type && file.type !== mimeType)) return jsonError("Only genuine PNG, JPG or WebP receipt images are accepted");

  const now = new Date();
  const expired = await prisma.paymentProof.findMany({ where: { orderId: null, expiresAt: { lte: now } }, select: { id: true, storagePath: true } }).catch(() => []);
  for (const old of expired) await unlink(old.storagePath).catch(() => {});
  if (expired.length) await prisma.paymentProof.deleteMany({ where: { id: { in: expired.map(item => item.id) }, orderId: null } }).catch(() => {});

  const token = randomBytes(32).toString("hex");
  const filename = `proof-${Date.now()}-${randomBytes(12).toString("hex")}.${mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp"}`;
  const folder = path.join(process.cwd(), "private_uploads", "payment-proofs");
  const storagePath = path.join(folder, filename);

  try {
    await mkdir(folder, { recursive: true });
    await writeFile(storagePath, buffer, { flag: "wx", mode: 0o600 });
    const proof = await prisma.paymentProof.create({
      data: {
        token,
        userId: user.id,
        fileName: file.name.slice(0, 180) || "payment-receipt",
        mimeType,
        fileSize: buffer.length,
        storagePath,
        expiresAt: new Date(Date.now() + PROOF_TTL_MS),
      },
      select: { id: true, token: true, mimeType: true, fileSize: true },
    });
    return NextResponse.json({ uploadToken: proof.token, mimeType: proof.mimeType, fileSize: proof.fileSize }, { status: 201 });
  } catch (error) {
    await unlink(storagePath).catch(() => {});
    console.error("Payment proof upload failed", error);
    return jsonError("Could not securely store the receipt. Please try again.", 503);
  }
}
