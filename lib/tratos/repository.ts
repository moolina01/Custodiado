import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { calculateFee } from "@/lib/pricing";
import { generateTratoCode, normalizeTratoCode } from "@/lib/codes";
import { getProfileByUserId } from "@/lib/profiles/repository";
import type { BankDetailsPayload } from "./validation";
import type { CreateTratoInput, CreatedByRole, TratoRow } from "./types";

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
        // en bank-details) — ahora viene del perfil, no de lo que el
        // cliente haya tipeado.
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
 * before the release has actually been submitted to Mercado Pago Payouts,
 * so a typo can still be fixed. No status change: this fills in fields the
 * release step (`lib/tratos/release.ts`) will read from later.
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
      seller_bank_name: input.bankName,
      seller_account_number: input.accountNumber,
      seller_account_type: input.accountType,
    })
    .eq("code", code)
    .select()
    .single();

  if (error) throw new Error(`No se pudieron guardar los datos bancarios: ${error.message}`);
  return { outcome: "saved", trato: data as TratoRow };
}

export type PaymentResolution =
  | { outcome: "not_found" }
  | { outcome: "matched"; trato: TratoRow } // just transitioned
  | { outcome: "already_settled"; trato: TratoRow }; // idempotent replay, or a status this event no longer applies to

/**
 * Flips `awaiting_payment -> funds_held` once a Checkout API payment comes
 * back `approved` — called both synchronously right after
 * `createCardPayment` (`app/api/tratos/[code]/pay/route.ts`) and from the
 * webhook (`app/api/webhooks/mercadopago/route.ts`), whichever lands
 * first; the other is then just an idempotent replay via the atomic status
 * guard below.
 *
 * Replaces Fintoc's `matchInboundPayment`: that matched inbound transfers
 * by exact pending amount within a time window because Fintoc's webhook
 * payload had no reference back to one specific trato. Mercado Pago hands
 * the trato's own code back as `external_reference` on every payment, so
 * this matches by `code` directly — exact, not best-effort — and there's
 * no RUT-mismatch branch to speak of: a Checkout API payment is inherently
 * "from the buyer who submitted the form", not a bank transfer whose
 * sender could be anyone.
 */
export async function resolvePaymentApproved(rawCode: string, orderId: string): Promise<PaymentResolution> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db
    .from(TABLE)
    .update({ status: "funds_held", mercadopago_order_id: orderId, paid_at: new Date().toISOString() })
    .eq("code", code)
    .eq("status", "awaiting_payment") // atomic guard against a concurrent/duplicate resolution
    .select()
    .maybeSingle();

  if (error) throw new Error(`No se pudo marcar el trato como pagado: ${error.message}`);
  if (data) return { outcome: "matched", trato: data as TratoRow };

  const existing = await getTratoByCode(code);
  return existing ? { outcome: "already_settled", trato: existing } : { outcome: "not_found" };
}

/**
 * Flips `refund_pending -> refunded` once the underlying order's status
 * (re-fetched via `getOrder`) comes back `refunded` — a Mercado Pago
 * refund doesn't need a separate transfer to a destination account (there
 * is none, see `lib/mercadopago/refunds.ts`), just confirmation that the
 * original order itself now reads as refunded.
 */
export async function resolvePaymentRefunded(rawCode: string): Promise<PaymentResolution> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db
    .from(TABLE)
    .update({ status: "refunded" })
    .eq("code", code)
    .eq("status", "refund_pending") // atomic guard against a concurrent/duplicate resolution
    .select()
    .maybeSingle();

  if (error) throw new Error(`No se pudo confirmar el reembolso: ${error.message}`);
  if (data) return { outcome: "matched", trato: data as TratoRow };

  const existing = await getTratoByCode(code);
  return existing ? { outcome: "already_settled", trato: existing } : { outcome: "not_found" };
}

/**
 * Dev/test-only escape hatch: flips `awaiting_payment -> funds_held`
 * directly, without a real Mercado Pago payment at all. Exists for local
 * development when the webhook endpoint isn't actually reachable from
 * Mercado Pago (no tunnel running, dashboard still pointing at a stale
 * URL) and the synchronous response from `createCardPayment` isn't being
 * exercised either. Marked with a `dev_forced_` payment id so it's
 * obviously not a real one if inspected later.
 */
export async function forceMarkFundsHeld(rawCode: string): Promise<TratoRow | null> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "funds_held",
      mercadopago_order_id: `dev_forced_${randomUUID()}`,
      paid_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("status", "awaiting_payment") // atomic guard, same shape as the other transitions
    .select()
    .maybeSingle();
  if (error) throw new Error(`No se pudo forzar el avance del pago: ${error.message}`);
  return (data as TratoRow | null) ?? null;
}

// ⚠️ See the warning atop lib/mercadopago/payouts.ts: Payouts' real status
// vocabulary wasn't confirmed against live docs while this was built.
// Unrecognized statuses deliberately fall through to "pending" (no change,
// logged by the caller) instead of guessing wrong and marking a trato
// released_at/release_failed incorrectly — fix this mapping once a real
// Payouts webhook payload has actually been seen.
export type PayoutOutcome = "succeeded" | "failed" | "pending";

export function mapPayoutStatusToOutcome(status: string | undefined): PayoutOutcome {
  const s = (status ?? "").toLowerCase();
  if (["processed", "success", "succeeded", "paid", "completed"].includes(s)) return "succeeded";
  if (["error", "rejected", "returned", "failed", "cancelled"].includes(s)) return "failed";
  return "pending";
}

/**
 * Resolves a Payouts webhook for the seller release — flips
 * `release_pending -> released`/`release_failed` depending on
 * `mapPayoutStatusToOutcome`'s reading of the payout's status. Returns
 * `null` if no trato references this payout id (nothing for us to do; not
 * an error).
 */
export async function resolveOutboundPayout(payoutId: string, outcome: PayoutOutcome): Promise<TratoRow | null> {
  if (outcome === "pending") return null; // nothing resolved yet — wait for a later notification
  const db = getSupabaseAdmin();

  const { data: match } = await db.from(TABLE).select().eq("mercadopago_payout_id", payoutId).maybeSingle();
  if (!match) return null;

  const nextStatus = outcome === "succeeded" ? "released" : "release_failed";
  const { data, error } = await db
    .from(TABLE)
    .update({ status: nextStatus, ...(outcome === "succeeded" ? { released_at: new Date().toISOString() } : {}) })
    .eq("id", match.id)
    .eq("status", "release_pending") // atomic guard; already-resolved deliveries just no-op below
    .select()
    .maybeSingle();
  if (error) throw new Error(`No se pudo actualizar la liberación: ${error.message}`);
  return (data as TratoRow | null) ?? (match as TratoRow);
}

/**
 * Atomically flips `funds_held -> release_pending` and mints the
 * idempotency key that (a) makes the upcoming Payouts call safe to retry
 * and (b) is what the "already in progress, don't call Mercado Pago again"
 * check in `lib/tratos/release.ts` relies on. Returns `null` if the trato
 * wasn't in `funds_held` (lost a race, or the caller's state was stale) —
 * the caller re-reads the row to decide what to do next.
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

/** Records which Payouts id a release attempt actually produced — the webhook later resolves the trato by this id. */
export async function attachPayout(tratoId: string, payoutId: string): Promise<TratoRow> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(TABLE).update({ mercadopago_payout_id: payoutId }).eq("id", tratoId).select().single();
  if (error) throw new Error(`No se pudo registrar la liberación: ${error.message}`);
  return data as TratoRow;
}

/**
 * Atomically flips `funds_held -> refund_pending` and mints the refund's
 * idempotency key in the same update. Mirrors `beginRelease` — same
 * retry-safety story via `lib/tratos/cancel.ts`. Unlike the Fintoc-era
 * version, doesn't collect a destination account: a Mercado Pago refund
 * goes back to the payment's own original payment method.
 */
export async function beginRefund(rawCode: string, reason?: string): Promise<TratoRow | null> {
  const db = getSupabaseAdmin();
  const code = normalizeTratoCode(rawCode);
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: "refund_pending",
      refund_idempotency_key: randomUUID(),
      cancel_reason: reason ?? null,
      cancelled_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("status", "funds_held")
    .select()
    .maybeSingle();
  if (error) throw new Error(`No se pudo iniciar el reembolso: ${error.message}`);
  return (data as TratoRow | null) ?? null;
}

/** Records which Mercado Pago refund id a refund attempt actually produced — resolved to `refunded` once the underlying payment's status confirms it (`resolvePaymentRefunded`). */
export async function attachRefund(tratoId: string, refundId: string): Promise<TratoRow> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(TABLE).update({ mercadopago_refund_id: refundId }).eq("id", tratoId).select().single();
  if (error) throw new Error(`No se pudo registrar el reembolso: ${error.message}`);
  return data as TratoRow;
}
