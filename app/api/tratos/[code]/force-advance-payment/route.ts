import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { toPublicDto } from "@/lib/tratos/dto";
import { forceMarkFundsHeld, getTratoByCode } from "@/lib/tratos/repository";

export const runtime = "nodejs";

/**
 * Dev/test-only escape hatch: skips a real Mercado Pago payment entirely
 * and flips the trato straight to `funds_held` — for when the local server
 * isn't reachable from Mercado Pago's webhook (no tunnel running,
 * dashboard pointing at a stale URL) and `POST /pay`'s synchronous
 * response isn't being exercised either. Hard-disabled outside development
 * so this can never be reachable in production.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (process.env.NODE_ENV === "production") {
    return jsonError(404, "Not found.");
  }

  const { code } = await params;

  try {
    const trato = await getTratoByCode(code);
    if (!trato) return jsonError(404, "Trato no encontrado. Revisa el código.");
    if (trato.status !== "awaiting_payment") {
      return jsonError(409, "Este trato no está esperando un pago en este momento.");
    }

    const updated = await forceMarkFundsHeld(code);
    if (!updated) {
      // Lost a race (e.g. the real webhook landed a moment earlier) — re-read and report the current state.
      const refetched = await getTratoByCode(code);
      if (!refetched) return jsonError(404, "Trato no encontrado. Revisa el código.");
      return jsonOk(toPublicDto(refetched));
    }
    return jsonOk(toPublicDto(updated));
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "No se pudo forzar el avance del pago.");
  }
}
