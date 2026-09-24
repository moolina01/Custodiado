import "server-only";
import { notifyAdminReleaseReady } from "@/lib/email/adminNotifications";
import { notifyReleaseStarted } from "@/lib/email/paymentNotifications";
import { beginManualRelease, getTratoByCode } from "./repository";
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

/**
 * The escrow release — the "QR scan" action. Money Out (Mercado Pago's
 * automated seller payout) is a restricted product Mercado Pago hasn't
 * approved for this account (see the warning atop
 * lib/mercadopago/payouts.ts), so this no longer pays the seller directly:
 * it hands the trato off to a manual transfer by the app's admin, with a
 * 24h window (release_deadline_at) for either side to flag a problem first.
 *
 * - `funds_held`: the normal case. Flips to `release_pending`, stamps the
 *   deadline, emails the admin the bank details to pay, and emails both
 *   sides a "trato hecho" confirmation.
 * - `release_pending`: already handed off — idempotent no-op (the admin
 *   panel is now the only thing that can move this further).
 * - `released`: already paid — idempotent success.
 */
export async function releaseTrato(rawCode: string): Promise<ReleaseResult> {
  const existing = await getTratoByCode(rawCode);
  if (!existing) return { outcome: "not_found" };

  if (existing.status === "released") return { outcome: "already_released", trato: existing };
  if (existing.status === "release_pending") return { outcome: "submitted", trato: existing };

  if (existing.status !== "funds_held") return { outcome: "wrong_status", trato: existing };
  if (!hasSellerBankDetails(existing)) return { outcome: "missing_bank_details" };

  const begun = await beginManualRelease(existing.code);
  if (!begun) {
    // Lost a race to a concurrent release click — fall through to whatever
    // state it's actually in now instead of erroring.
    const refetched = await getTratoByCode(existing.code);
    if (!refetched) return { outcome: "not_found" };
    if (refetched.status === "released") return { outcome: "already_released", trato: refetched };
    return { outcome: "submitted", trato: refetched };
  }

  await notifyAdminReleaseReady(begun);
  await notifyReleaseStarted(begun);
  return { outcome: "submitted", trato: begun };
}
