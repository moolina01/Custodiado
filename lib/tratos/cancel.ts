import "server-only";
import { createOutboundTransfer } from "@/lib/fintoc/transfers";
import { attachRefundTransfer, beginRefund, getTratoByCode, type RefundDestination } from "./repository";
import type { TratoRow } from "./types";

export type CancelResult =
  | { outcome: "not_found" }
  | { outcome: "wrong_status"; trato: TratoRow }
  | { outcome: "not_owner"; trato: TratoRow }
  | { outcome: "already_refunded"; trato: TratoRow }
  | { outcome: "submitted"; trato: TratoRow };

/**
 * The buyer's cancel/refund — only reachable from `funds_held` (matches
 * `RetenidosStep`, which only offers it once the money is actually held;
 * before that there's nothing to refund, and after release it's too late).
 * Same retry-safety shape as `lib/tratos/release.ts`: safe to call more
 * than once at any point in the process.
 *
 * SPEC 04: replaces SPEC 03's RUT-comparison check with an ownership
 * check — the session calling this must be the same account whose
 * `buyer_user_id` this trato recorded at create/accept.
 */
export async function cancelTrato(rawCode: string, destination: RefundDestination, userId: string): Promise<CancelResult> {
  const existing = await getTratoByCode(rawCode);
  if (!existing) return { outcome: "not_found" };

  if (existing.status === "refunded") return { outcome: "already_refunded", trato: existing };

  if (existing.status === "funds_held") {
    if (existing.buyer_user_id !== userId) return { outcome: "not_owner", trato: existing };

    const begun = await beginRefund(existing.code, destination);
    if (!begun) {
      const refetched = await getTratoByCode(existing.code);
      return refetched ? continueRefund(refetched) : { outcome: "not_found" };
    }
    return submitRefundToFintoc(begun);
  }

  if (existing.status === "refund_pending") {
    return continueRefund(existing);
  }

  return { outcome: "wrong_status", trato: existing };
}

/**
 * SPEC 03: resumes a refund that's already `refund_pending` with its
 * destination and idempotency key saved — exactly the shape
 * `matchInboundPayment` (lib/tratos/repository.ts) leaves a trato in right
 * after detecting a RUT mismatch on the inbound transfer. Reused instead of
 * duplicated: submitting to Fintoc is identical either way, only how the
 * trato *got* to `refund_pending` differs (the buyer's own click vs. the
 * webhook's automatic check).
 */
export function resumeRefund(trato: TratoRow): Promise<CancelResult> | CancelResult {
  return continueRefund(trato);
}

function continueRefund(trato: TratoRow): Promise<CancelResult> | CancelResult {
  if (trato.fintoc_refund_transfer_id) {
    return { outcome: "submitted", trato }; // already sent to Fintoc; the webhook will resolve it
  }
  return submitRefundToFintoc(trato); // idempotency key exists but the Fintoc call never completed — safe to retry
}

async function submitRefundToFintoc(trato: TratoRow): Promise<CancelResult> {
  if (!trato.refund_idempotency_key) {
    throw new Error("El trato quedó en refund_pending sin idempotency key. Estado inconsistente.");
  }
  if (!trato.buyer_rut || !trato.buyer_bank_institution_id || !trato.buyer_account_number || !trato.buyer_account_type) {
    throw new Error("Faltan los datos bancarios del comprador para el reembolso.");
  }

  const transfer = await createOutboundTransfer({
    idempotencyKey: trato.refund_idempotency_key,
    amountClp: trato.amount_clp + trato.fee_clp, // full refund — the commission goes back too, nobody keeps it on a cancelled trato
    comment: `Reembolso escrow trato ${trato.code}`,
    counterparty: {
      holderId: trato.buyer_rut,
      holderName: trato.buyer_name!, // set at creation or accept — always present by the time funds_held is reached
      accountNumber: trato.buyer_account_number,
      accountType: trato.buyer_account_type,
      institutionId: trato.buyer_bank_institution_id,
    },
  });

  const updated = await attachRefundTransfer(trato.id, transfer.id);
  return { outcome: "submitted", trato: updated };
}
