import "server-only";
import { createOutboundTransfer } from "@/lib/fintoc/transfers";
import { attachOutboundTransfer, beginRelease, getTratoByCode } from "./repository";
import type { TratoRow } from "./types";

export type ReleaseResult =
  | { outcome: "not_found" }
  | { outcome: "missing_bank_details" }
  | { outcome: "wrong_status"; trato: TratoRow }
  | { outcome: "already_released"; trato: TratoRow }
  | { outcome: "submitted"; trato: TratoRow };

const SELLER_BANK_FIELDS = ["seller_rut", "seller_bank_institution_id", "seller_account_number", "seller_account_type"] as const;

function hasSellerBankDetails(trato: TratoRow): boolean {
  return SELLER_BANK_FIELDS.every((field) => Boolean(trato[field]));
}

/**
 * The escrow release — the "QR scan" action. Real money movement, so every
 * branch here is written to be safe to call more than once:
 *
 * - `funds_held`: the normal case. Mints an idempotency key and submits to
 *   Fintoc in one go.
 * - `release_pending` with no `fintoc_outbound_transfer_id` yet: a previous
 *   attempt got as far as reserving the idempotency key but never heard
 *   back from Fintoc (crash, timeout) — retries the *same* Fintoc call with
 *   the *same* key, which Fintoc treats as the same request either way.
 * - `release_pending` with a `fintoc_outbound_transfer_id` already set: már
 *   submitted, just waiting on the webhook — no-op, don't call Fintoc again.
 * - `released`: already done — idempotent success.
 */
export async function releaseTrato(rawCode: string): Promise<ReleaseResult> {
  const existing = await getTratoByCode(rawCode);
  if (!existing) return { outcome: "not_found" };

  if (existing.status === "released") return { outcome: "already_released", trato: existing };

  if (existing.status === "funds_held") {
    if (!hasSellerBankDetails(existing)) return { outcome: "missing_bank_details" };

    const begun = await beginRelease(existing.code);
    if (!begun) {
      // Lost a race to a concurrent release click — fall through to
      // whatever state it's actually in now instead of erroring.
      const refetched = await getTratoByCode(existing.code);
      return refetched ? continueRelease(refetched) : { outcome: "not_found" };
    }
    return submitToFintoc(begun);
  }

  if (existing.status === "release_pending") {
    return continueRelease(existing);
  }

  return { outcome: "wrong_status", trato: existing };
}

function continueRelease(trato: TratoRow): Promise<ReleaseResult> | ReleaseResult {
  if (trato.fintoc_outbound_transfer_id) {
    return { outcome: "submitted", trato }; // already sent to Fintoc; the webhook will resolve it
  }
  return submitToFintoc(trato); // idempotency key exists but the Fintoc call never completed — safe to retry
}

async function submitToFintoc(trato: TratoRow): Promise<ReleaseResult> {
  if (!trato.outbound_idempotency_key) {
    // Shouldn't happen — `beginRelease` always sets this in the same update that sets `release_pending`.
    throw new Error("El trato quedó en release_pending sin idempotency key. Estado inconsistente.");
  }
  if (!hasSellerBankDetails(trato)) {
    // Also shouldn't happen (checked before entering release_pending) — re-guarded since this fires Fintoc calls.
    throw new Error("Faltan los datos bancarios del vendedor.");
  }

  const transfer = await createOutboundTransfer({
    idempotencyKey: trato.outbound_idempotency_key,
    amountClp: trato.amount_clp, // the seller's cut — the fee stays with the platform, never leaves the account
    comment: `Liberación escrow trato ${trato.code}`,
    counterparty: {
      holderId: trato.seller_rut!,
      holderName: trato.seller_name!,
      accountNumber: trato.seller_account_number!,
      accountType: trato.seller_account_type!,
      institutionId: trato.seller_bank_institution_id!,
    },
  });

  const updated = await attachOutboundTransfer(trato.id, transfer.id);
  return { outcome: "submitted", trato: updated };
}
