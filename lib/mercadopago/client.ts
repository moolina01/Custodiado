import "server-only";

/**
 * The access token everything in `lib/mercadopago/` authenticates with.
 * Orders (`./payments.ts`), Refunds (`./refunds.ts`), and Payouts
 * (`./payouts.ts`) all call their REST endpoints directly instead of going
 * through the `mercadopago` npm SDK — Orders API refunds
 * (`POST /v1/orders/{id}/refund`) and Payouts aren't wrapped by it, and
 * once those two needed raw `fetch`, there was no reason to keep the SDK
 * client around just for order creation. The `mercadopago` package in
 * package.json is unused now; safe to remove in a follow-up if wanted.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

export function getMercadoPagoAccessToken(): string {
  return requireEnv("MERCADOPAGO_ACCESS_TOKEN");
}
