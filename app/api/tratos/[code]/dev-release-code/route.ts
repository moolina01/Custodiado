import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { mintReleaseCode } from "@/lib/tratos/releaseCode";
import { getTratoByCode } from "@/lib/tratos/repository";
import type { TratoRow } from "@/lib/tratos/types";

export const runtime = "nodejs";

// Same gate as GET /release-code — no point minting a code once there's no payout left to release.
const RELEASE_CODE_BLOCKED_STATUSES: TratoRow["status"][] = ["released", "refunded", "refund_failed"];

/**
 * Dev/test-only escape hatch, mirroring `dev-qr-token`: returns the buyer's
 * currently valid release code without requiring their session, so the
 * seller's "Simular ingreso (dev)" button (see `ReleaseCodeStep.tsx`) can
 * exercise the whole flow from one device/tab. Hard-disabled outside
 * development, same guard as every other dev-only route.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (process.env.NODE_ENV === "production") {
    return jsonError(404, "Not found.");
  }

  const { code } = await params;

  try {
    const trato = await getTratoByCode(code);
    if (!trato) return jsonError(404, "Trato no encontrado, revisa el código.");
    if (RELEASE_CODE_BLOCKED_STATUSES.includes(trato.status)) {
      return jsonError(400, "Este trato ya no admite generar un código.");
    }

    const { code: releaseCode, expiresAt } = mintReleaseCode(trato.code);
    return jsonOk({ code: releaseCode, expiresAt });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al generar el código.");
  }
}
