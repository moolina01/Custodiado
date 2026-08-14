import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { resumeRefund } from "@/lib/tratos/cancel";
import { toPublicDto } from "@/lib/tratos/dto";
import { forceRutMismatchRefund, getTratoByCode } from "@/lib/tratos/repository";

export const runtime = "nodejs";

// Fixed dummy sender — stands in for "a real inbound transfer whose RUT
// doesn't match the buyer's declared identity" (SPEC 03). Fintoc's sandbox
// `simulate.receiveTransfer` doesn't let a test transfer report its own
// `counterparty`, so this is the only way to exercise the mismatch path in
// `npm run dev` without a real bank transfer.
const DUMMY_MISMATCHED_SENDER = {
  holderId: "11.111.111-1",
  holderName: "Cuenta de prueba (RUT no coincide)",
  accountNumber: "000999999999",
  accountType: "checking_account" as const,
  institutionId: "cl_banco_estado",
};

/**
 * Dev/test-only: forces the same `awaiting_payment -> refund_pending` path
 * a real RUT-mismatched inbound transfer takes, then actually submits the
 * refund to Fintoc's sandbox — only the part that can't be controlled (what
 * `counterparty` a simulated transfer reports) is faked. Hard-disabled
 * outside development, same as `simulate-payment`/`force-advance-payment`.
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

    const updated = await forceRutMismatchRefund(code, DUMMY_MISMATCHED_SENDER);
    if (!updated) {
      // Lost a race (e.g. a real payment matched a moment earlier) — re-read and report the current state.
      const refetched = await getTratoByCode(code);
      if (!refetched) return jsonError(404, "Trato no encontrado. Revisa el código.");
      return jsonOk(toPublicDto(refetched));
    }

    const result = await resumeRefund(updated);
    if (result.outcome === "not_found") return jsonError(404, "Trato no encontrado. Revisa el código.");
    return jsonOk(toPublicDto(result.trato));
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "No se pudo simular el RUT no coincidente.");
  }
}
