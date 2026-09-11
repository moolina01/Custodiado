import "server-only";
import { getMercadoPagoAccessToken } from "./client";

export type BankAccountType = "checking_account" | "sight_account";

export type PayoutDestination = {
  holderId: string; // RUT
  holderName: string;
  accountNumber: string;
  accountType: BankAccountType;
  bankName: string;
  // Mercado Pago's own numeric bank id for this contract (e.g. Chile's
  // `bank_id`) — NOT the same thing as `bankName` (our display string from
  // `lib/mercadopago/banks.ts`). There is currently no verified mapping
  // from `bankName` to a real `bank_id` per bank; see the warning below.
  bankId: string;
};

/** Minimal shape we actually read off a transaction-intent response — unconfirmed, see warning below. */
export type MercadoPagoPayout = { id: string; status?: string; [key: string]: unknown };

const TRANSACTION_INTENTS_URL = "https://api.mercadopago.com/v1/transaction-intents/process";

/**
 * ⚠️⚠️⚠️ BLOCKED — not just unverified, actually non-functional right now.
 * Confirmed live against Mercado Pago's real support queue (ticket
 * WCS-50128, 2026-09): every call to this file's endpoint — in TEST mode,
 * with `X-Test-Token: true`, no real money involved — returns `403
 * PolicyAgent / PA_UNAUTHORIZED_RESULT_FROM_POLICIES`. Support's own words:
 *
 *   "Money Out / Payouts es un producto restringido. No se habilita desde
 *   soporte técnico ni mediante un cambio técnico del tipo de cuenta...
 *   deben gestionarla por su canal comercial o la Central de Ayuda...
 *   indiquen: caso de uso, tipo de beneficiarios, país (Chile), volumen
 *   estimado y frecuencia, datos de cuenta/aplicación. Una vez aprobada
 *   la habilitación comercial, el equipo correspondiente les informará
 *   los requisitos técnicos aplicables. Por el momento, no utilicen
 *   /v1/transaction-intents/process: no es un endpoint público para
 *   integraciones estándar."
 *
 * Two separate findings, not one:
 * 1. This is not self-service at any level — no dashboard toggle, no
 *    support ticket, no test-mode exception. It requires a commercial
 *    application (use case, beneficiary type, country, estimated
 *    volume/frequency, account/app details) reviewed and approved by
 *    Mercado Pago's commercial team, who then supply "the applicable
 *    technical requirements" — which may not even be this endpoint.
 * 2. `/v1/transaction-intents/process` (what this file calls) is, per
 *    that same message, *not a public endpoint for standard
 *    integrations* — so even once commercially approved, the actual
 *    contract to use might differ from what's implemented below. Treat
 *    everything here as provisional until Mercado Pago's post-approval
 *    technical requirements are in hand; don't extend or "fix" this file
 *    from documentation alone before that.
 *
 * Until commercial approval lands, `releaseTrato` (lib/tratos/release.ts)
 * cannot succeed for a real trato — every attempt will throw this same
 * 403. There is no code fix available for that; it's a business-side
 * blocker, not a bug. Do not attempt to work around it (a different
 * endpoint guessed from docs, a country-mismatched contract, etc.) — wait
 * for Mercado Pago's actual guidance.
 *
 * Everything below is preserved best-effort from before this was known —
 * the original implementation notes, for whenever the real contract shows
 * up:
 *
 * Rewritten once already after discovering, live, that the version before
 * *this* targeted the wrong product entirely: `POST /v1/payouts` (batch
 * Payouts) is Argentina/Brazil's contract. Mercado Pago's own
 * documentation guidance is explicit that Payouts contracts are
 * country-specific and that the AR/BR contract must never be assumed for
 * another country. Chile's product is called **Money Out** — a different
 * endpoint and payload shape from AR/BR, per Mercado Pago's own support
 * bot (not the written docs — docs.mercadopago.cl blocks automated
 * fetching, so this couldn't be cross-checked against the official
 * reference while writing it), and now *also* not confirmed to be this
 * exact endpoint per the finding above.
 *
 * Confirmed-uncertain pieces, left as explicit gaps rather than silent
 * guesses:
 * - `bank_id` is Mercado Pago's own numeric bank identifier, NOT the
 *   display name in `lib/mercadopago/banks.ts`. There's no verified
 *   mapping table from one to the other — `PayoutDestination.bankId` is
 *   currently the test fixture's value passed straight through by
 *   whatever calls this (see `lib/tratos/release.ts`), not looked up from
 *   the seller's chosen bank. Needs a real bank_id catalog before this
 *   can pay out to an arbitrary seller-chosen bank.
 * - `type` ("current" for cuenta corriente is confirmed by the fixture
 *   example; the "cuenta vista" equivalent is not — see
 *   `mapAccountType` below).
 * - The response body's exact field names (is it `id` or something else,
 *   what does `status` look like) were never shown — only the request was
 *   confirmed. `MercadoPagoPayout` here is a best-effort guess to be
 *   corrected against whatever a real test call actually returns.
 * - Test-mode `external_reference` is NOT a free-form reference here the
 *   way it is elsewhere in this codebase (Orders API, Refunds) — Mercado
 *   Pago's test environment reads specific magic strings from it to
 *   select a simulated outcome (`"new"` for a normal/successful test
 *   transaction, `"failed_invalid_destination_account"` to simulate that
 *   failure, etc.). Production behavior for this field is unconfirmed;
 *   `buildExternalReference` below only handles the test-mode case.
 */
/**
 * ⚠️ No real bank_id catalog exists for this contract — Mercado Pago's own
 * numeric id per Chilean bank was never confirmed for any bank besides
 * the one in their fixture example. `bankName` (the seller's actual
 * choice from `lib/mercadopago/banks.ts`) is accepted here but currently
 * ignored — every destination resolves to the fixture id. Fine for
 * testing (Mercado Pago's own guidance says the test destination can be
 * the fixture data), a real gap before this pays out to an arbitrary
 * seller-chosen bank in production.
 */
export function resolveBankId(_bankName: string): string {
  return "99999004";
}

function mapAccountType(type: BankAccountType): string {
  if (type === "checking_account") return "current";
  // TODO: unconfirmed — "checking" is a placeholder, not verified against
  // a real Money Out test call for a "cuenta vista" destination.
  return "checking";
}

function buildExternalReference(isProd: boolean): string {
  // Test mode: this string selects a simulated scenario, not a real
  // reference — "new" is what Mercado Pago's own support conversation
  // gave as the "goes through normally" case.
  if (!isProd) return "new";
  // Production: unconfirmed what this should carry once real transactions
  // are actually authorized (see the commercial-authorization warning
  // above) — using the idempotency key as a placeholder real reference.
  throw new Error(
    "Falta confirmar el contrato de producción de Money Out (Chile) antes de liberar plata real — ver el warning en lib/mercadopago/payouts.ts."
  );
}

export async function createOutboundPayout(params: {
  idempotencyKey: string;
  amountClp: number;
  description: string;
  destination: PayoutDestination;
  notificationUrl: string;
}): Promise<MercadoPagoPayout> {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) assertProductionSigningConfigured();

  const requestBody = {
    external_reference: buildExternalReference(isProd),
    point_of_interaction: { type: "PSP_TRANSFER" },
    seller_configuration: { notification_info: { notification_url: params.notificationUrl } },
    transaction: {
      from: { accounts: [{ amount: params.amountClp }] },
      to: {
        accounts: [
          {
            amount: params.amountClp,
            bank_id: params.destination.bankId,
            type: mapAccountType(params.destination.accountType),
            number: params.destination.accountNumber,
            owner: { identification: { type: "RUT", number: params.destination.holderId } },
          },
        ],
      },
      total_amount: params.amountClp,
    },
  };
  console.log("[payouts] POST /v1/transaction-intents/process body:", JSON.stringify(requestBody));

  const response = await fetch(TRANSACTION_INTENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey,
      // Test-mode headers per Mercado Pago support — production instead
      // needs a signed `X-signature` (see `assertProductionSigningConfigured`).
      ...(isProd ? { "x-enforce-signature": "true" } : { "X-Test-Token": "true", "x-enforce-signature": "false" }),
    },
    body: JSON.stringify(requestBody),
  });

  const body = (await response.json().catch(() => ({}))) as MercadoPagoPayout | Record<string, unknown>;
  console.log(`[payouts] response status ${response.status}:`, JSON.stringify(body));
  if (!response.ok) {
    throw new Error(`Mercado Pago Money Out respondió ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as MercadoPagoPayout;
}

/**
 * Deliberately throws instead of silently sending an unsigned (or
 * guessed-at-signing) production payout request — see the warning above.
 * Remove once `X-signature` is actually implemented against Mercado
 * Pago's confirmed Money Out signing scheme, AND once the account has
 * commercial authorization to operate Money Out for real.
 */
function assertProductionSigningConfigured(): void {
  throw new Error(
    "Falta implementar la firma X-signature de producción para Mercado Pago Money Out antes de liberar plata real en vivo. Ver el comentario en lib/mercadopago/payouts.ts."
  );
}

/**
 * ⚠️ Unconfirmed: guessed as a REST-conventional `GET` on the same
 * resource. Mercado Pago's support conversation only confirmed the
 * creation call — this wasn't verified at all. Fix once the webhook
 * flow for Money Out is actually exercised against a live test.
 */
export async function getPayout(payoutId: string): Promise<MercadoPagoPayout> {
  const response = await fetch(`https://api.mercadopago.com/v1/transaction-intents/${payoutId}`, {
    headers: { Authorization: `Bearer ${getMercadoPagoAccessToken()}` },
  });
  const body = (await response.json().catch(() => ({}))) as MercadoPagoPayout | Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Mercado Pago Money Out respondió ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as MercadoPagoPayout;
}
