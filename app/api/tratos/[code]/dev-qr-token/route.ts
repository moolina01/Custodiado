import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { mintQrToken } from "@/lib/tratos/qrToken";
import { getTratoByCode } from "@/lib/tratos/repository";
import type { TratoRow } from "@/lib/tratos/types";

export const runtime = "nodejs";

// Same gate as GET /qr-token — no point minting a token once there's no payout left to release.
const QR_BLOCKED_STATUSES: TratoRow["status"][] = ["released", "refunded", "refund_failed"];

/**
 * Dev/test-only escape hatch, next to `simulate-payment`/`force-advance-payment`:
 * returns the seller's currently valid QR token without the
 * `x-seller-qr-secret` header, so the whole scan-and-release flow can be
 * exercised from one device/tab (no second phone with a camera needed).
 * Hard-disabled outside development so this can never be reachable in
 * production — same guard as the other dev-only routes.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (process.env.NODE_ENV === "production") {
    return jsonError(404, "Not found.");
  }

  const { code } = await params;

  try {
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
