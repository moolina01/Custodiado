import { jsonError, jsonOk } from "@/lib/http";
import { getFintocRootAccountNumber } from "@/lib/fintoc/client";

export const runtime = "nodejs";

/** The escrow account buyers transfer to — shown on the `pagar` step. Not secret; a bank account number is meant to be given out. */
export async function GET() {
  try {
    return jsonOk({ accountNumber: getFintocRootAccountNumber() });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "No se pudo obtener la cuenta de custodia.");
  }
}
