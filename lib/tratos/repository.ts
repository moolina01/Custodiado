import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { calculateFee } from "@/lib/pricing";
import { generateTratoCode, normalizeTratoCode } from "@/lib/codes";
import { sameRut } from "@/lib/rut";
import { getProfileByUserId } from "@/lib/profiles/repository";
import type { InboundCounterparty } from "@/lib/fintoc/webhookParsing";
import type { BankDetailsPayload } from "./validation";
import type { CreateTratoInput, CreatedByRole, FintocAccountType, TratoRow } from "./types";

// The trato's status when bank details may still be submitted/updated —
// any time before the money has actually moved.
const BANK_DETAILS_ALLOWED_STATUSES: TratoRow["status"][] = ["awaiting_payment", "funds_held"];

const TABLE = "tratos";
const MAX_CODE_ATTEMPTS = 5;
const POSTGRES_UNIQUE_VIOLATION = "23505";

/** Opaque once-issued secret for whoever holds the `vendedor` role — see `seller_qr_secret` on `TratoRow`. */
function generateSellerQrSecret(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Creates a trato with a freshly generated code, retrying on the rare code
 * collision.
 *
 * SPEC 04: `name`/`rut` ya no vienen en `input` — se leen del perfil de
 * `userId` (la cuenta logueada que hace la llamada), la misma identidad
 * para cualquier trato que esa cuenta cree.
 */
export async function createTrato(input: CreateTratoInput, userId: string): Promise<TratoRow> {
  const db = getSupabaseAdmin();
  const feeClp = calculateFee(input.amountClp);
  const isBuyer = input.role === "comprador";

  const profile = await getProfileByUserId(userId);
  if (!profile) throw new Error("No se encontró el perfil de esta cuenta.");

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await db
      .from(TABLE)
      .insert({
        code: generateTratoCode(),
        created_by_role: input.role,
        item: input.item,
        amount_clp: input.amountClp,
        fee_clp: feeClp,
        buyer_name: isBuyer ? profile.name : null,
        seller_name: isBuyer ? null : profile.name,
        // SPEC 04: cuenta dueña de este lado — habilita el chequeo de
        // ownership en bank-details/cancel (ver submitSellerBankDetails más
        // abajo y lib/tratos/cancel.ts).
        buyer_user_id: isBuyer ? userId : null,
        seller_user_id: isBuyer ? null : userId,
        // SPEC 03: RUT de identidad, guardado de inmediato en la misma
        // columna que el RUT de la cuenta bancaria usa más tarde (seller_rut
        // en bank-details, buyer_rut en cancel) — ahora viene del perfil, no
        // de lo que el cliente haya tipeado.
        buyer_rut: isBuyer ? profile.rut : null,
        seller_rut: isBuyer ? null : profile.rut,
        seller_qr_secret: isBuyer ? null : generateSellerQrSecret(),
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

/**
 * SPEC 05: every trato where `userId` was either side, newest first —
 * backs `/panel`. Relies on the indexes added in
 * `0006_add_trato_user_indexes.sql` (an unindexed `.or()` here would be a
 * full table scan).
 */
export async function getTratosForUser(userId: string): Promise<TratoRow[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .or(`buyer_user_id.eq.${userId},seller_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron listar los tratos: ${error.message}`);
  return (data as TratoRow[] | null) ?? [];
}

/**
 * Reads the once-issued seller QR secret for `code`. Internal use only —
 * checked against the `x-seller-qr-secret` header in `GET /qr-token`, never
 * exposed in `PublicTratoDto` or any other client-facing response.
 */
export async function getSellerQrSecret(rawCode: string): Promise<string | null> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db.from(TABLE).select("seller_qr_secret").eq("code", code).maybeSingle();
  if (error) throw new Error(`No se pudo leer el secreto del QR: ${error.message}`);
  return (data as { seller_qr_secret: string | null } | null)?.seller_qr_secret ?? null;
}

export type AcceptResult =
  | { outcome: "not_found" }
  | { outcome: "wrong_role"; trato: TratoRow }
  | { outcome: "cannot_accept_own_trato"; trato: TratoRow }
  | { outcome: "accepted" | "already_accepted"; trato: TratoRow };

/**
 * The counterpart accepts a trato with its code. Idempotent: calling this
 * again after it already succeeded just returns the current row instead of
 * erroring, so a double-submit (slow network, double-tap) is harmless.
 *
 * SPEC 04: `name`/`rut` ya no vienen como parámetros — se leen del perfil
 * de `userId`. También bloquea que la misma cuenta acepte un trato que ella
 * misma creó con el otro rol (`wrong_role` solo cubre el caso de repetir el
 * *mismo* rol, no el de la *misma cuenta* con el rol contrario).
 */
export async function acceptTrato(rawCode: string, role: CreatedByRole, userId: string): Promise<AcceptResult> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);

  const existing = await getTratoByCode(code);
  if (!existing) return { outcome: "not_found" };
  if (existing.created_by_role === role) return { outcome: "wrong_role", trato: existing };
  if (existing.status !== "awaiting_acceptance") return { outcome: "already_accepted", trato: existing };

  const creatorUserId = existing.buyer_user_id ?? existing.seller_user_id;
  if (creatorUserId && creatorUserId === userId) {
    return { outcome: "cannot_accept_own_trato", trato: existing };
  }

  const profile = await getProfileByUserId(userId);
  if (!profile) throw new Error("No se encontró el perfil de esta cuenta.");

  const isBuyer = role === "comprador";
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "awaiting_payment",
      accepted_at: new Date().toISOString(),
      // SPEC 03: mismo RUT de identidad que `createTrato` guarda para quien
      // crea el trato — acá lo guarda quien lo acepta. SPEC 04: ahora sale
      // del perfil, no de lo que el cliente haya tipeado, y queda también
      // el vínculo a la cuenta (`*_user_id`).
      ...(isBuyer
        ? { buyer_name: profile.name, buyer_rut: profile.rut, buyer_user_id: userId }
        : { seller_name: profile.name, seller_rut: profile.rut, seller_user_id: userId, seller_qr_secret: generateSellerQrSecret() }),
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
  | { outcome: "not_owner"; trato: TratoRow }
  | { outcome: "saved"; trato: TratoRow };

/**
 * The seller submits (or edits) their payout details — allowed any time
 * before the release/refund transfer has actually been submitted to
 * Fintoc, so a typo can still be fixed. No status change: this fills in
 * fields the release step (M6) will read from later.
 *
 * SPEC 04: replaces SPEC 03's RUT-comparison check with an ownership
 * check — the session calling this must be the same account whose
 * `seller_user_id` this trato recorded at create/accept. Comparing RUTs
 * directly would be redundant now: the identity RUT always comes from that
 * same account's profile, never something the client types per trato.
 */
export async function submitSellerBankDetails(rawCode: string, input: BankDetailsPayload, userId: string): Promise<BankDetailsResult> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);

  const existing = await getTratoByCode(code);
  if (!existing) return { outcome: "not_found" };
  if (!BANK_DETAILS_ALLOWED_STATUSES.includes(existing.status)) return { outcome: "wrong_status", trato: existing };
  if (existing.seller_user_id !== userId) return { outcome: "not_owner", trato: existing };

  const { data, error } = await db
    .from(TABLE)
    .update({
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
  | { outcome: "rut_mismatch"; trato: TratoRow }
  | { outcome: "already_processed"; trato: TratoRow }
  | { outcome: "no_match" };

// SPEC 03: the sender's counterparty data is only usable to auto-refund if
// it's complete enough for `createOutboundTransfer` — a `holder_id` alone
// isn't a bank account. If Fintoc reports a RUT but not the rest, there's
// nowhere to safely send the money back to, so this is treated the same as
// "no counterparty reported" (proceed to `funds_held`, same as before this
// spec) rather than stranding the trato in `refund_pending` forever.
function hasRefundableCounterparty(
  counterparty: InboundCounterparty | undefined
): counterparty is InboundCounterparty & { accountNumber: string; accountType: FintocAccountType; institutionId: string } {
  return Boolean(counterparty?.accountNumber && counterparty.accountType && counterparty.institutionId);
}

const RUT_MISMATCH_CANCEL_REASON = "La transferencia no vino de una cuenta a tu nombre. El dinero se devolvió automáticamente.";

/**
 * MVP matching for `transfer.inbound.succeeded`: Fintoc's webhook payload
 * doesn't expose a reference we can tie back to one specific trato (open
 * question in the escrow plan — all inbound transfers land in the same
 * shared account), so this matches by exact pending amount among tratos
 * `awaiting_payment` within a short window. Ambiguous or zero matches are
 * left in `fintoc_webhook_events` (`matched_trato_id` null) for manual
 * reconciliation — there's no admin UI for that yet.
 *
 * SPEC 03: `senderCounterparty` is whatever Fintoc reported about who sent
 * the transfer (may be absent — see `hasRefundableCounterparty` above). If
 * it's present, complete, and its RUT doesn't match the candidate's
 * `buyer_rut`, the trato never becomes `funds_held` — it goes straight to
 * `refund_pending`, with the sender's own reported account as the refund
 * destination (nothing the buyer has to fill in).
 */
export async function matchInboundPayment(
  transferId: string,
  amountClp: number,
  senderCounterparty?: InboundCounterparty
): Promise<InboundMatchResult> {
  const db = getSupabaseAdmin();

  // A retried webhook for a transfer we already matched (or already
  // auto-refunded — see below) — idempotent no-op.
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

  if (hasRefundableCounterparty(senderCounterparty) && !sameRut(senderCounterparty.holderId, match.buyer_rut ?? "")) {
    const { data: refunded, error: refundError } = await db
      .from(TABLE)
      .update({
        status: "refund_pending",
        refund_idempotency_key: randomUUID(),
        // Dedupe key for a retried delivery of this same webhook event —
        // same column `funds_held` would have used, just a different
        // outcome this time.
        fintoc_inbound_transfer_id: transferId,
        // Overwrites the buyer's declared identity name/RUT/account with the
        // sender's actual ones — fine, this trato is headed to a terminal
        // state and these fields aren't read for anything else afterward.
        // `buyer_name` matters here: `submitRefundToFintoc` (lib/tratos/
        // cancel.ts) sends it to Fintoc as the outbound transfer's
        // `holder_name`, which must match the account it's actually going
        // to — the sender's, not the buyer's declared one.
        buyer_name: senderCounterparty.holderName ?? match.buyer_name,
        buyer_rut: senderCounterparty.holderId,
        buyer_bank_institution_id: senderCounterparty.institutionId,
        buyer_account_number: senderCounterparty.accountNumber,
        buyer_account_type: senderCounterparty.accountType,
        refund_reason: "rut_mismatch",
        cancel_reason: RUT_MISMATCH_CANCEL_REASON,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", match.id)
      .eq("status", "awaiting_payment") // atomic guard against a concurrent match
      .select()
      .maybeSingle();

    if (refundError) throw new Error(`No se pudo iniciar la devolución automática: ${refundError.message}`);
    if (!refunded) return { outcome: "no_match" }; // lost a race — another delivery matched it first
    return { outcome: "rut_mismatch", trato: refunded as TratoRow };
  }

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

/**
 * SPEC 03, dev/test-only escape hatch, mirrors `forceMarkFundsHeld` above
 * but for the opposite outcome: flips `awaiting_payment -> refund_pending`
 * directly, as `matchInboundPayment`'s mismatch branch would, using a fixed
 * dummy sender instead of a real one — Fintoc's sandbox
 * (`simulate.receiveTransfer`) doesn't let a simulated transfer report its
 * own `counterparty`, so there's no way to make a real mismatch happen in
 * dev. The caller is expected to call `resumeRefund` (lib/tratos/cancel.ts)
 * right after, same as the webhook route does for a real mismatch.
 */
export async function forceRutMismatchRefund(
  rawCode: string,
  senderCounterparty: { holderId: string; holderName: string; accountNumber: string; accountType: FintocAccountType; institutionId: string }
): Promise<TratoRow | null> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "refund_pending",
      refund_idempotency_key: randomUUID(),
      fintoc_inbound_transfer_id: `dev_forced_${randomUUID()}`,
      buyer_name: senderCounterparty.holderName,
      buyer_rut: senderCounterparty.holderId,
      buyer_bank_institution_id: senderCounterparty.institutionId,
      buyer_account_number: senderCounterparty.accountNumber,
      buyer_account_type: senderCounterparty.accountType,
      refund_reason: "rut_mismatch",
      cancel_reason: RUT_MISMATCH_CANCEL_REASON,
      cancelled_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("status", "awaiting_payment") // atomic guard, same shape as the other transitions
    .select()
    .maybeSingle();
  if (error) throw new Error(`No se pudo simular el RUT no coincidente: ${error.message}`);
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

// SPEC 04: ya no lleva `rut` — el RUT de destino del reembolso es
// `existing.buyer_rut`, ya guardado al crear/aceptar desde el perfil de la
// cuenta, y este update no lo toca (queda como estaba).
export type RefundDestination = {
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
