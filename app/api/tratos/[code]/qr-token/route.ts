import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { mintQrToken } from "@/lib/tratos/qrToken";
import { getSellerQrSecret, getTratoByCode } from "@/lib/tratos/repository";
import type { TratoRow } from "@/lib/tratos/types";

export const runtime = "nodejs";

// Same shape as accept's rate limit — a low-volume action the seller's own
// screen calls once per 30s interval, not a hot path.
const QR_TOKEN_LIMIT = 20;
const QR_TOKEN_WINDOW_SECONDS = 60;

// Once the trato has landed in one of these, there's no payout left to
// gate behind a QR — no point minting one.
const QR_BLOCKED_STATUSES: TratoRow["status"][] = ["released", "refunded", "refund_failed"];

/** Constant-time string compare — avoids leaking the seller secret's length/prefix via response timing. */
function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Mints a fresh QR token for the seller's screen. Requires proof of the
 * once-issued `x-seller-qr-secret` (see `lib/tratos/repository.ts`) — this
 * is what stops anyone with just the trato's `code` from generating a
 * scannable, fund-releasing QR of their own (see SPEC 02).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const allowed = await checkRateLimit(`qr-token:${getClientIp(request)}`, QR_TOKEN_LIMIT, QR_TOKEN_WINDOW_SECONDS);
  if (!allowed) return jsonError(429, "Demasiadas solicitudes. Intenta de nuevo en un momento.");

  const providedSecret = request.headers.get("x-seller-qr-secret");
  if (!providedSecret) return jsonError(401, "Falta el header x-seller-qr-secret.");

  try {
    const storedSecret = await getSellerQrSecret(code);
    if (!storedSecret || !secretsMatch(storedSecret, providedSecret)) {
      return jsonError(401, "Secreto de vendedor inválido.");
    }

    const trato = await getTratoByCode(code);
    if (!trato) return jsonError(404, "Trato no encontrado. Revisa el código.");
    if (QR_BLOCKED_STATUSES.includes(trato.status)) {
      return jsonError(400, "Este trato ya no admite generar un QR.");
    }

    const { token, expiresAt } = mintQrToken(trato.code);
    return jsonOk({ token, expiresAt });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al generar el token del QR.");
  }
}
