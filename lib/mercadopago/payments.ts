import "server-only";
import { getMercadoPagoAccessToken } from "./client";

/** Minimal shape we actually read off Mercado Pago's order response — the Orders API resource is loosely typed. */
export type MercadoPagoOrder = {
  id: string;
  status: "created" | "processed" | "action_required" | "canceled" | "failed" | "refunded" | string;
  status_detail?: string;
  external_reference?: string | null;
  transactions?: {
    payments?: Array<{
      id?: string;
      status?: string;
      status_detail?: string;
      payment_method?: { id?: string; type?: string };
    }>;
  };
  [key: string]: unknown;
};

const ORDERS_URL = "https://api.mercadopago.com/v1/orders";

/**
 * The buyer's payment — Orders API (`POST /v1/orders`, `type: "online"`):
 * the card was already tokenized client-side (MP.js `cardForm`, see
 * `components/flujo/steps/PagarStep.tsx`), so the raw card number never
 * reaches this server, only the resulting `token`. Mercado Pago's
 * `/v1/payments`-based "Checkout API (Payments mode)" is being
 * discontinued across every country MP operates in — this app's own
 * Developer Dashboard app creation flow surfaces that deprecation notice
 * directly, and MP's integration guidance says to always use Orders API
 * for card payments, no country-conditional fallback. `externalReference`
 * is the trato code — Mercado Pago hands it straight back on both the
 * synchronous response and the webhook, so matching an order to a trato
 * is exact instead of best-effort. `idempotencyKey` must be generated once
 * per attempt and reused on retries of *that same* attempt (a genuinely
 * new attempt — e.g. the buyer fixing a declined card — mints a new one;
 * see `app/api/tratos/[code]/pay/route.ts`).
 *
 * Confirmed live against two real order rejections (400 `property_value`,
 * on the same field, contradicting each other until both were seen):
 * `cardForm.getCardFormData().paymentMethodId` returns Mercado Pago's own
 * per-scheme ids (e.g. `"debvisa"` for a Chilean Visa debit card) — the
 * `id` itself must be passed through **unchanged** (stripping the `deb`
 * prefix, tried first, got "must be one of 'debmaster', 'debvisa'" back
 * for a debit card). The prefix is real signal, just not for `id` — it's
 * the only way this app can tell credit from debit at all (the legacy
 * `cardForm` iframe form doesn't expose that separately), so it decides
 * `payment_method.type` instead (see `normalizePaymentMethod`).
 */
function normalizePaymentMethod(paymentMethodId: string): { id: string; type: "credit_card" | "debit_card" } {
  const isDebit = paymentMethodId.startsWith("deb");
  return { id: paymentMethodId, type: isDebit ? "debit_card" : "credit_card" };
}
export async function createCardOrder(params: {
  idempotencyKey: string;
  token: string;
  totalAmountClp: number;
  installments: number;
  paymentMethodId: string;
  payerEmail: string;
  payerIdentification: { type: string; number: string };
  externalReference: string;
  description: string;
}): Promise<MercadoPagoOrder> {
  // Confirmed live: `.toFixed(2)` (copied from Mercado Pago's own Brazil/BRL
  // example) fails Orders API validation for CLP — "'$.total_amount' - does
  // not match pattern". CLP has zero decimal subunits, so the amount is a
  // plain integer string ("15000", not "15000.00"). This app only ever
  // charges in CLP (see lib/pricing.ts) — a currency with decimals would
  // need its own formatting here.
  const amount = String(params.totalAmountClp);
  const paymentMethod = normalizePaymentMethod(params.paymentMethodId);

  const response = await fetch(ORDERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      type: "online",
      processing_mode: "automatic",
      total_amount: amount,
      external_reference: params.externalReference,
      description: params.description,
      payer: {
        email: params.payerEmail,
        identification: { type: params.payerIdentification.type, number: params.payerIdentification.number },
      },
      transactions: {
        payments: [
          {
            amount,
            payment_method: {
              id: paymentMethod.id,
              type: paymentMethod.type,
              token: params.token,
              installments: params.installments,
              // issuer_id is deliberately omitted — Orders API rejects it inside payment_method.
            },
          },
        ],
      },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as MercadoPagoOrder | Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Mercado Pago Orders respondió ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as MercadoPagoOrder;
}

/** Re-fetches an order by id — what the webhook handler calls, since the notification itself only carries the id (see `lib/mercadopago/webhookParsing.ts`). */
export async function getOrder(orderId: string): Promise<MercadoPagoOrder> {
  const response = await fetch(`${ORDERS_URL}/${orderId}`, {
    headers: { Authorization: `Bearer ${getMercadoPagoAccessToken()}` },
  });
  const body = (await response.json().catch(() => ({}))) as MercadoPagoOrder | Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Mercado Pago Orders respondió ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as MercadoPagoOrder;
}
