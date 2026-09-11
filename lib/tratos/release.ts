import "server-only";
import { createOutboundPayout, resolveBankId } from "@/lib/mercadopago/payouts";
import { attachPayout, beginRelease, getTratoByCode } from "./repository";
import type { TratoRow } from "./types";

export type ReleaseResult =
  | { outcome: "not_found" }
  | { outcome: "missing_bank_details" }
  | { outcome: "wrong_status"; trato: TratoRow }
  | { outcome: "already_released"; trato: TratoRow }
  | { outcome: "submitted"; trato: TratoRow };

const SELLER_BANK_FIELDS = ["seller_rut", "seller_bank_name", "seller_account_number", "seller_account_type"] as const;

function hasSellerBankDetails(trato: TratoRow): boolean {
  return SELLER_BANK_FIELDS.every((field) => Boolean(trato[field]));
}

function requireAppBaseUrl(): string {
  const url = process.env.APP_BASE_URL;
  if (!url) throw new Error("Missing APP_BASE_URL. Copy .env.example to .env.local and fill it in.");
  return url;
}

/**
 * The escrow release — the "QR scan" action. Real money movement, so every
 * branch here is written to be safe to call more than once:
 *
 * - `funds_held`: the normal case. Mints an idempotency key and submits to
 *   Mercado Pago Payouts in one go.
 * - `release_pending` with no `mercadopago_payout_id` yet: a previous
 *   attempt got as far as reserving the idempotency key but never heard
 *   back from Payouts (crash, timeout) — retries the *same* call with the
 *   *same* key, which Payouts treats as the same request either way.
 * - `release_pending` with a `mercadopago_payout_id` already set: already
 *   submitted, just waiting on the webhook — no-op, don't call Payouts
 *   again.
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
    return submitToMercadoPago(begun);
  }

  if (existing.status === "release_pending") {
    return continueRelease(existing);
  }

  return { outcome: "wrong_status", trato: existing };
}

function continueRelease(trato: TratoRow): Promise<ReleaseResult> | ReleaseResult {
  if (trato.mercadopago_payout_id) {
    return { outcome: "submitted", trato }; // already sent to Payouts; the webhook will resolve it
  }
  return submitToMercadoPago(trato); // idempotency key exists but the Payouts call never completed — safe to retry
}

async function submitToMercadoPago(trato: TratoRow): Promise<ReleaseResult> {
  if (!trato.outbound_idempotency_key) {
    // Shouldn't happen — `beginRelease` always sets this in the same update that sets `release_pending`.
    throw new Error("El trato quedó en release_pending sin idempotency key. Estado inconsistente.");
  }
  if (!hasSellerBankDetails(trato)) {
    // Also shouldn't happen (checked before entering release_pending) — re-guarded since this fires real transfers.
    throw new Error("Faltan los datos bancarios del vendedor.");
  }

  console.log(`[release] submitting payout for trato ${trato.code}, amount ${trato.amount_clp}`);
  const payout = await createOutboundPayout({
    idempotencyKey: trato.outbound_idempotency_key,
    amountClp: trato.amount_clp, // the seller's cut — the fee stays with the platform, never leaves the account
    description: `Liberación escrow trato ${trato.code}`,
    destination: {
      holderId: trato.seller_rut!,
      holderName: trato.seller_name!,
      accountNumber: trato.seller_account_number!,
      accountType: trato.seller_account_type!,
      bankName: trato.seller_bank_name!,
      bankId: resolveBankId(trato.seller_bank_name!),
    },
    notificationUrl: `${requireAppBaseUrl()}/api/webhooks/mercadopago`,
  });
  console.log(`[release] createOutboundPayout returned:`, payout);

  const updated = await attachPayout(trato.id, payout.id);
  return { outcome: "submitted", trato: updated };
}
