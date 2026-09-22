import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { mintReleaseCode } from "@/lib/tratos/releaseCode";
import { getTratoByCode } from "@/lib/tratos/repository";
import type { TratoRow } from "@/lib/tratos/types";

export const runtime = "nodejs";

// Same shape as qr-token's rate limit — the buyer's own screen calls this
// once per 45s interval, not a hot path.
const RELEASE_CODE_LIMIT = 20;
const RELEASE_CODE_WINDOW_SECONDS = 60;

// Once the trato has landed in one of these, there's no payout left to gate
// behind a code — no point minting one. Same list as qr-token's.
const RELEASE_CODE_BLOCKED_STATUSES: TratoRow["status"][] = ["released", "refunded", "refund_failed"];

/**
 * Mints a fresh release code for the buyer's screen (the code-based
 * alternative to `GET /qr-token` — see `components/flujo/releaseMethod.ts`
 * for the switch between the two). Unlike the seller's QR token, this
 * doesn't need a separate opaque secret to prove ownership: the buyer
 * already has a real session by this point, so `trato.buyer_user_id` is
 * checked against it directly — same pattern `pay`/`bank-details` use.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const allowed = await checkRateLimit(`release-code:${getClientIp(request)}`, RELEASE_CODE_LIMIT, RELEASE_CODE_WINDOW_SECONDS);
  if (!allowed) return jsonError(429, "Demasiadas solicitudes, intenta de nuevo en un momento.");

  try {
    const user = await requireSessionUser();

    const trato = await getTratoByCode(code);
    if (!trato) return jsonError(404, "Trato no encontrado, revisa el código.");
    if (trato.buyer_user_id !== user.id) return jsonError(403, "Esta cuenta no es la que aceptó este trato como comprador.");
    if (RELEASE_CODE_BLOCKED_STATUSES.includes(trato.status)) {
      return jsonError(400, "Este trato ya no admite generar un código.");
    }

    const { code: releaseCode, expiresAt } = mintReleaseCode(trato.code);
    return jsonOk({ code: releaseCode, expiresAt });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al generar el código.");
  }
}
