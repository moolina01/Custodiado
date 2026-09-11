import "server-only";
import { getMercadoPagoAccessToken } from "./client";

/**
 * What `POST /v1/orders/{orderId}/refund` actually returns — confirmed
 * live: it's the **updated order**, not a standalone refund resource.
 * Its top-level `id` is the *order* id (same one passed in), not a refund
 * id — the actual refund is nested at `transactions.refunds[0]`. An
 * earlier version of this file assumed a flat `{id, status}` refund
 * object and stored the order id into `mercadopago_refund_id` by
 * mistake; fixed by `refundIdFrom` below.
 */
export type MercadoPagoOrderAfterRefund = {
  id: string; // the order's own id, NOT the refund id
  status?: string;
  transactions?: { refunds?: Array<{ id?: string; status?: string; amount?: string }> };
  [key: string]: unknown;
};

/** Pulls the actual refund id out of a refund response — see the type's doc comment for why this isn't just `.id`. */
export function refundIdFrom(order: MercadoPagoOrderAfterRefund): string | null {
  const refundId = order.transactions?.refunds?.[0]?.id;
  return typeof refundId === "string" ? refundId : null;
}

/**
 * The buyer's cancel/refund. Unlike Fintoc — which had no concept of
 * "reverse this specific inbound transfer" and so needed the buyer's own
 * bank details collected lazily just to send a fresh outbound transfer
 * (`lib/fintoc/transfers.ts`, deleted) — Mercado Pago refunds an order by
 * its own id, straight back to whatever the buyer originally paid with. No
 * destination account to collect or validate.
 *
 * This is `POST /v1/orders/{orderId}/refund` (Orders API — note "refund"
 * singular, not the old Payments API's `/v1/payments/{id}/refunds`), per
 * the same migration that moved order creation off `/v1/payments` (see
 * `./payments.ts`). Confirmed live end-to-end (order → `status:
 * "refunded"`, nested `transactions.refunds[0]` present).
 *
 * `idempotencyKey` is required — confirmed live (400
 * `empty_required_header: Missing HTTP header: X-Idempotency-Key`) after
 * this endpoint was first written without it. `lib/tratos/cancel.ts`
 * already mints and persists `refund_idempotency_key` per trato before
 * calling this; the header was simply never wired through until now.
 */
export async function refundOrder(orderId: string, idempotencyKey: string): Promise<MercadoPagoOrderAfterRefund> {
  console.log(`[refunds] POST /v1/orders/${orderId}/refund`);
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({}), // omitting `amount` means a full refund
  });

  const body = (await response.json().catch(() => ({}))) as MercadoPagoOrderAfterRefund;
  console.log(`[refunds] response status ${response.status}:`, JSON.stringify(body));
  if (!response.ok) {
    throw new Error(`Mercado Pago Orders respondió ${response.status} al reembolsar: ${JSON.stringify(body)}`);
  }
  return body;
}
