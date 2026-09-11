import "server-only";
import { getOrder } from "@/lib/mercadopago/payments";
import { refundIdFrom, refundOrder } from "@/lib/mercadopago/refunds";
import { attachRefund, beginRefund, getTratoByCode, resolvePaymentRefunded } from "./repository";
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
 * Doesn't collect (or need) a destination account: a Mercado Pago refund
 * goes back to whatever the buyer originally paid with
 * (`lib/mercadopago/refunds.ts`) — a real simplification over the Fintoc
 * era, which had no "reverse this transfer" primitive and so had to
 * collect the buyer's own bank details just to send a fresh outbound
 * transfer.
 *
 * SPEC 04: ownership check — the session calling this must be the same
 * account whose `buyer_user_id` this trato recorded at create/accept.
 */
export async function cancelTrato(rawCode: string, userId: string, reason?: string): Promise<CancelResult> {
  const existing = await getTratoByCode(rawCode);
  if (!existing) return { outcome: "not_found" };

  if (existing.status === "refunded") return { outcome: "already_refunded", trato: existing };

  if (existing.status === "funds_held") {
    if (existing.buyer_user_id !== userId) return { outcome: "not_owner", trato: existing };

    const begun = await beginRefund(existing.code, reason);
    if (!begun) {
      const refetched = await getTratoByCode(existing.code);
      return refetched ? continueRefund(refetched) : { outcome: "not_found" };
    }
    return submitRefundToMercadoPago(begun);
  }

  if (existing.status === "refund_pending") {
    return continueRefund(existing);
  }

  return { outcome: "wrong_status", trato: existing };
}

async function continueRefund(trato: TratoRow): Promise<CancelResult> {
  if (trato.mercadopago_refund_id) {
    // Already submitted to Mercado Pago on a previous call — but per the
    // finding in `submitRefundToMercadoPago`'s doc comment, the webhook
    // that was supposed to flip this to `refunded` may simply never
    // arrive. Re-check with Mercado Pago directly instead of trusting a
    // webhook that might not be coming (this is what a trato that reached
    // `refund_pending` *before* that fix existed looks like — reconciles
    // it instead of leaving it stuck).
    const order = await getOrder(trato.mercadopago_order_id!);
    if (order.status === "refunded") {
      const resolution = await resolvePaymentRefunded(trato.code);
      if (resolution.outcome !== "not_found") return { outcome: "submitted", trato: resolution.trato };
    }
    return { outcome: "submitted", trato };
  }
  return submitRefundToMercadoPago(trato); // idempotency reserved but the refund call never completed — safe to retry
}

/**
 * Confirmed live: two separate test refunds, against two different
 * webhook URLs (a flaky local tunnel, then a stable Vercel preview),
 * both produced zero webhook deliveries for the "orders" topic — despite
 * Mercado Pago's own refund response coming back `status: "refunded"`
 * immediately, synchronously, in the same call. Whatever the reason
 * (Mercado Pago may simply not fire an `orders` webhook for a
 * refund-via-`/refund` transition, as opposed to genuine order status
 * changes), waiting on the webhook alone left every refunded trato stuck
 * in `refund_pending` forever with nothing to unstick it.
 *
 * Mirrors `app/api/tratos/[code]/pay/route.ts`'s existing pattern for the
 * *approval* side: resolve synchronously off the API response we already
 * have in hand, and let the webhook (`resolvePaymentRefunded`'s other
 * caller, in `app/api/webhooks/mercadopago/route.ts`) act as a no-op
 * safety net if it ever does arrive instead of the sole path to
 * `refunded`.
 */
async function submitRefundToMercadoPago(trato: TratoRow): Promise<CancelResult> {
  if (!trato.refund_idempotency_key) {
    throw new Error("El trato quedó en refund_pending sin idempotency key. Estado inconsistente.");
  }
  if (!trato.mercadopago_order_id) {
    // Shouldn't happen — funds_held is only reached once a Checkout API payment resolved.
    throw new Error("El trato no tiene un pago de Mercado Pago asociado para reembolsar.");
  }

  const order = await refundOrder(trato.mercadopago_order_id, trato.refund_idempotency_key);
  const refundId = refundIdFrom(order);
  if (!refundId) {
    // The order-level request succeeded (2xx) but didn't carry a
    // transactions.refunds[0].id the way a normal refund does — don't
    // silently store a wrong id (e.g. the order id) like this did before.
    throw new Error(`Mercado Pago confirmó el reembolso pero no devolvió un id de refund reconocible: ${JSON.stringify(order)}`);
  }
  const withRefundId = await attachRefund(trato.id, refundId);

  if (order.status === "refunded") {
    const resolution = await resolvePaymentRefunded(trato.code);
    if (resolution.outcome !== "not_found") return { outcome: "submitted", trato: resolution.trato };
  }
  // Not yet `refunded` per Mercado Pago's own response (rare — a refund
  // usually resolves synchronously) — stays `refund_pending`; the webhook
  // remains the path forward for this specific case, for whatever that's
  // worth given the finding above.
  return { outcome: "submitted", trato: withRefundId };
}
