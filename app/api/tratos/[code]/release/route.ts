import { jsonError, jsonOk } from "@/lib/http";
import { toPublicDto } from "@/lib/tratos/dto";
import { releaseTrato } from "@/lib/tratos/release";

export const runtime = "nodejs";

/** The buyer's "Escanear el QR" action — triggers the real (test-mode) escrow release. See lib/tratos/release.ts for why every branch here is retry-safe. */
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

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
