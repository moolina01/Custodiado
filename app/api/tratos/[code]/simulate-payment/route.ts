import { jsonError, jsonOk } from "@/lib/http";
import { simulateInboundTransfer } from "@/lib/fintoc/transfers";
import { getTratoByCode } from "@/lib/tratos/repository";

export const runtime = "nodejs";

/**
 * Dev/test-only: stands in for the buyer actually transferring money, by
 * asking Fintoc to simulate an inbound transfer landing in the platform's
 * account. The trato itself doesn't change here — Fintoc's real
 * `transfer.inbound.succeeded` webhook is what moves it to `funds_held`,
 * same as it would for a real transfer. Hard-disabled outside development
 * so this can never be reachable in production.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
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

    const totalClp = trato.amount_clp + trato.fee_clp;
    const transfer = await simulateInboundTransfer({ amountClp: totalClp });
    return jsonOk({ simulated: true, transferId: transfer.id, amountClp: totalClp }, 202);
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "No se pudo simular el pago.");
  }
}
