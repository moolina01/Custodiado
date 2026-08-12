import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { toPublicDto } from "@/lib/tratos/dto";
import { verifyQrToken } from "@/lib/tratos/qrToken";
import { releaseTrato } from "@/lib/tratos/release";
import { verifyQrSchema } from "@/lib/tratos/validation";

export const runtime = "nodejs";

/**
 * The only path that can execute `releaseTrato` (SPEC 02) — replaces the
 * old `POST /release`, which trusted nothing but the trato's status. Here
 * the buyer must first submit a token their camera actually scanned off the
 * seller's screen; only a token that verifies (`verifyQrToken`) unlocks the
 * same release logic `/release` used to run directly. See
 * `lib/tratos/release.ts` for why every branch of `releaseTrato` is
 * retry-safe.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = verifyQrSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  if (!verifyQrToken(code, parsed.data.token)) {
    return jsonError(400, "QR inválido o vencido, pedile al vendedor que lo muestre de nuevo.");
  }

  try {
    const result = await releaseTrato(code);

    switch (result.outcome) {
      case "not_found":
        return jsonError(404, "Trato no encontrado. Revisa el código.");
      case "missing_bank_details":
        return jsonError(409, "Al vendedor le faltan los datos bancarios todavía.");
      case "wrong_status":
        return jsonError(409, "Este trato no está listo para liberar el pago.");
      case "already_released":
      case "submitted":
        return jsonOk(toPublicDto(result.trato));
    }
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "No se pudo liberar el pago.");
  }
}
