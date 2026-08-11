import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { calculateFee } from "@/lib/pricing";
import { generateTratoCode, normalizeTratoCode } from "@/lib/codes";
import type { BankDetailsPayload } from "./validation";
import type { CreateTratoInput, CreatedByRole, TratoRow } from "./types";

// The trato's status when bank details may still be submitted/updated —
// any time before the money has actually moved.
const BANK_DETAILS_ALLOWED_STATUSES: TratoRow["status"][] = ["awaiting_payment", "funds_held"];

const TABLE = "tratos";
const MAX_CODE_ATTEMPTS = 5;
const POSTGRES_UNIQUE_VIOLATION = "23505";

/** Creates a trato with a freshly generated code, retrying on the rare code collision. */
export async function createTrato(input: CreateTratoInput): Promise<TratoRow> {
  const db = getSupabaseAdmin();
  const feeClp = calculateFee(input.amountClp);
  const isBuyer = input.role === "comprador";

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await db
      .from(TABLE)
      .insert({
        code: generateTratoCode(),
        created_by_role: input.role,
        item: input.item,
        amount_clp: input.amountClp,
        fee_clp: feeClp,
        buyer_name: isBuyer ? input.name : null,
        seller_name: isBuyer ? null : input.name,
      })
      .select()
      .single();

    if (!error) return data as TratoRow;
    if (error.code !== POSTGRES_UNIQUE_VIOLATION) throw new Error(`No se pudo crear el trato: ${error.message}`);
    // Unique violation on `code` — extremely unlikely (32^6 space), just retry with a new one.
  }

  throw new Error("No se pudo generar un código de trato único, reintenta.");
}

export async function getTratoByCode(rawCode: string): Promise<TratoRow | null> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db.from(TABLE).select().eq("code", code).maybeSingle();
  if (error) throw new Error(`No se pudo buscar el trato: ${error.message}`);
  return (data as TratoRow | null) ?? null;
}

export type AcceptResult =
  | { outcome: "not_found" }
  | { outcome: "wrong_role"; trato: TratoRow }
  | { outcome: "accepted" | "already_accepted"; trato: TratoRow };

/**
 * The counterpart accepts a trato with its code. Idempotent: calling this
 * again after it already succeeded just returns the current row instead of
 * erroring, so a double-submit (slow network, double-tap) is harmless.
 */
export async function acceptTrato(rawCode: string, role: CreatedByRole, name: string): Promise<AcceptResult> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);

  const existing = await getTratoByCode(code);
  if (!existing) return { outcome: "not_found" };
  if (existing.created_by_role === role) return { outcome: "wrong_role", trato: existing };
  if (existing.status !== "awaiting_acceptance") return { outcome: "already_accepted", trato: existing };

  const isBuyer = role === "comprador";
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "awaiting_payment",
      accepted_at: new Date().toISOString(),
      ...(isBuyer ? { buyer_name: name } : { seller_name: name }),
    })
    .eq("code", code)
    .eq("status", "awaiting_acceptance") // atomic guard against a concurrent double-accept
    .select()
    .maybeSingle();

  if (error) throw new Error(`No se pudo aceptar el trato: ${error.message}`);
  if (!data) {
    // Lost the race to a concurrent accept — treat as idempotent success.
    const refetched = await getTratoByCode(code);
    return refetched ? { outcome: "already_accepted", trato: refetched } : { outcome: "not_found" };
  }
  return { outcome: "accepted", trato: data as TratoRow };
}

export type BankDetailsResult =
  | { outcome: "not_found" }
  | { outcome: "wrong_status"; trato: TratoRow }
  | { outcome: "saved"; trato: TratoRow };

/**
 * The seller submits (or edits) their payout details — allowed any time
 * before the release/refund transfer has actually been submitted to
 * Fintoc, so a typo can still be fixed. No status change: this fills in
 * fields the release step (M6) will read from later.
 */
export async function submitSellerBankDetails(rawCode: string, input: BankDetailsPayload): Promise<BankDetailsResult> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);

  const existing = await getTratoByCode(code);
  if (!existing) return { outcome: "not_found" };
  if (!BANK_DETAILS_ALLOWED_STATUSES.includes(existing.status)) return { outcome: "wrong_status", trato: existing };

  const { data, error } = await db
    .from(TABLE)
    .update({
      seller_rut: input.rut,
      seller_bank_institution_id: input.bankInstitutionId,
      seller_account_number: input.accountNumber,
      seller_account_type: input.accountType,
    })
    .eq("code", code)
    .select()
    .single();

  if (error) throw new Error(`No se pudieron guardar los datos bancarios: ${error.message}`);
  return { outcome: "saved", trato: data as TratoRow };
}

// How far back to look for a trato waiting on the exact amount an inbound
// transfer just brought in — see `matchInboundPayment` for why this exists.
const INBOUND_MATCH_WINDOW_MINUTES = 30;

export type InboundMatchResult =
  | { outcome: "matched"; trato: TratoRow }
  | { outcome: "already_processed"; trato: TratoRow }
  | { outcome: "no_match" };

/**
 * MVP matching for `transfer.inbound.succeeded`: Fintoc's webhook payload
 * doesn't expose a reference we can tie back to one specific trato (open
 * question in the escrow plan — all inbound transfers land in the same
 * shared account), so this matches by exact pending amount among tratos
 * `awaiting_payment` within a short window. Ambiguous or zero matches are
 * left in `fintoc_webhook_events` (`matched_trato_id` null) for manual
 * reconciliation — there's no admin UI for that yet.
 */
export async function matchInboundPayment(transferId: string, amountClp: number): Promise<InboundMatchResult> {
  const db = getSupabaseAdmin();

  // A retried webhook for a transfer we already matched — idempotent no-op.
  const { data: already } = await db.from(TABLE).select().eq("fintoc_inbound_transfer_id", transferId).maybeSingle();
  if (already) return { outcome: "already_processed", trato: already as TratoRow };

  const since = new Date(Date.now() - INBOUND_MATCH_WINDOW_MINUTES * 60_000).toISOString();
  const { data: candidates, error } = await db
    .from(TABLE)
    .select()
    .eq("status", "awaiting_payment")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`No se pudo buscar coincidencias de pago: ${error.message}`);

  const match = (candidates as TratoRow[] | null)?.find((t) => t.amount_clp + t.fee_clp === amountClp);
  if (!match) return { outcome: "no_match" };

  const { data: updated, error: updateError } = await db
    .from(TABLE)
    .update({ status: "funds_held", fintoc_inbound_transfer_id: transferId, paid_at: new Date().toISOString() })
    .eq("id", match.id)
    .eq("status", "awaiting_payment") // atomic guard against a concurrent match
    .select()
    .maybeSingle();

  if (updateError) throw new Error(`No se pudo marcar el trato como pagado: ${updateError.message}`);
  if (!updated) return { outcome: "no_match" }; // lost a race — another delivery matched it first
  return { outcome: "matched", trato: updated as TratoRow };
}

/**
 * Dev/test-only escape hatch: flips `awaiting_payment -> funds_held`
 * directly, without a matching Fintoc transfer at all. Exists for local
 * development when the webhook endpoint isn't actually reachable from
 * Fintoc (no tunnel running, dashboard still pointing at a stale URL,
 * etc.) — `simulate-payment` asks Fintoc's sandbox to fire the real
 * `transfer.inbound.succeeded` webhook, but if that webhook never lands,
 * the trato is stuck. Marked with a `dev_forced_` transfer id so it's
 * obviously not a real Fintoc transfer if inspected later; harmless if a
 * delayed real webhook shows up afterwards — `matchInboundPayment` only
 * looks at tratos still `awaiting_payment`, so it just finds no match.
 */
export async function forceMarkFundsHeld(rawCode: string): Promise<TratoRow | null> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "funds_held",
      fintoc_inbound_transfer_id: `dev_forced_${randomUUID()}`,
      paid_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("status", "awaiting_payment") // atomic guard, same shape as the other transitions
    .select()
    .maybeSingle();
  if (error) throw new Error(`No se pudo forzar el avance del pago: ${error.message}`);
  return (data as TratoRow | null) ?? null;
}

// "returned" = the destination bank rejected the transfer (Fintoc's actual
// Chile event name — plan-escrow.md called this "rejected", which isn't a
// real Fintoc event; verified against docs.fintoc.com's live event list).
export type OutboundOutcome = "succeeded" | "returned" | "failed";

/**
 * Resolves `transfer.outbound.*` webhooks — could be either the seller
 * release (M6) or a buyer refund (M7), whichever `fintoc_*_transfer_id`
 * column matches. Returns `null` if no trato references this transfer id
 * (nothing for us to do; not an error).
 */
export async function resolveOutboundTransfer(transferId: string, outcome: OutboundOutcome): Promise<TratoRow | null> {
  const db = getSupabaseAdmin();

  const { data: releaseMatch } = await db.from(TABLE).select().eq("fintoc_outbound_transfer_id", transferId).maybeSingle();
  if (releaseMatch) {
    const nextStatus = outcome === "succeeded" ? "released" : "release_failed";
    const { data, error } = await db
      .from(TABLE)
      .update({ status: nextStatus, ...(outcome === "succeeded" ? { released_at: new Date().toISOString() } : {}) })
      .eq("id", releaseMatch.id)
      .eq("status", "release_pending") // atomic guard; already-resolved deliveries just no-op below
      .select()
      .maybeSingle();
    if (error) throw new Error(`No se pudo actualizar la liberación: ${error.message}`);
    return (data as TratoRow | null) ?? (releaseMatch as TratoRow);
  }

  const { data: refundMatch } = await db.from(TABLE).select().eq("fintoc_refund_transfer_id", transferId).maybeSingle();
  if (refundMatch) {
    const nextStatus = outcome === "succeeded" ? "refunded" : "refund_failed";
    const { data, error } = await db
      .from(TABLE)
      .update({ status: nextStatus })
      .eq("id", refundMatch.id)
      .eq("status", "refund_pending")
      .select()
      .maybeSingle();
    if (error) throw new Error(`No se pudo actualizar el reembolso: ${error.message}`);
    return (data as TratoRow | null) ?? (refundMatch as TratoRow);
  }

  return null;
}

/**
 * Atomically flips `funds_held -> release_pending` and mints the
 * idempotency key that (a) makes the upcoming Fintoc call safe to retry and
 * (b) is what the "already in progress, don't call Fintoc again" check in
 * `lib/tratos/release.ts` relies on. Returns `null` if the trato wasn't in
 * `funds_held` (lost a race, or the caller's state was stale) — the caller
 * re-reads the row to decide what to do next.
 */
export async function beginRelease(rawCode: string): Promise<TratoRow | null> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db
    .from(TABLE)
    .update({ status: "release_pending", outbound_idempotency_key: randomUUID() })
    .eq("code", code)
    .eq("status", "funds_held")
    .select()
    .maybeSingle();
  if (error) throw new Error(`No se pudo iniciar la liberación: ${error.message}`);
  return (data as TratoRow | null) ?? null;
}

/** Records which Fintoc transfer a release attempt actually produced — the webhook later resolves the trato by this id. */
export async function attachOutboundTransfer(tratoId: string, transferId: string): Promise<TratoRow> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(TABLE).update({ fintoc_outbound_transfer_id: transferId }).eq("id", tratoId).select().single();
  if (error) throw new Error(`No se pudo registrar la transferencia: ${error.message}`);
  return data as TratoRow;
}

export type RefundDestination = {
  rut: string;
  bankInstitutionId: string;
  accountNumber: string;
  accountType: TratoRow["seller_account_type"];
  reason?: string;
};

/**
 * Atomically flips `funds_held -> refund_pending`, saves where to send the
 * buyer's money back (collected lazily — there's no "reverse this specific
 * inbound transfer" primitive, see the escrow plan's open questions), and
 * mints the refund's idempotency key in the same update. Mirrors
 * `beginRelease` — same retry-safety story via `lib/tratos/cancel.ts`.
 */
export async function beginRefund(rawCode: string, destination: RefundDestination): Promise<TratoRow | null> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "refund_pending",
      refund_idempotency_key: randomUUID(),
      buyer_rut: destination.rut,
      buyer_bank_institution_id: destination.bankInstitutionId,
      buyer_account_number: destination.accountNumber,
      buyer_account_type: destination.accountType,
      cancel_reason: destination.reason ?? null,
      cancelled_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("status", "funds_held")
    .select()
    .maybeSingle();
  if (error) throw new Error(`No se pudo iniciar el reembolso: ${error.message}`);
  return (data as TratoRow | null) ?? null;
}

/** Records which Fintoc transfer a refund attempt actually produced — the webhook later resolves the trato by this id. */
export async function attachRefundTransfer(tratoId: string, transferId: string): Promise<TratoRow> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(TABLE).update({ fintoc_refund_transfer_id: transferId }).eq("id", tratoId).select().single();
  if (error) throw new Error(`No se pudo registrar la transferencia de reembolso: ${error.message}`);
  return data as TratoRow;
}
