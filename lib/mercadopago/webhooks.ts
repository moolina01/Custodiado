import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export { parseMercadoPagoWebhookEvent, webhookResourceType, type MercadoPagoWebhookEvent } from "./webhookParsing";

/**
 * Verifies a Mercado Pago webhook's `x-signature` header against
 * `MERCADOPAGO_WEBHOOK_SECRET` (Your integrations -> Webhooks -> Secret key
 * on the dashboard) before anything in the payload is trusted.
 *
 * Scheme (docs.mercadopago.com/.../notifications/webhooks): `x-signature`
 * is `ts=<unix ms>,v1=<hex hmac>`; the manifest actually hashed is
 * `id:<data.id lowercased>;request-id:<x-request-id>;ts:<ts>;`,
 * HMAC-SHA256'd with the secret. `dataId` is the notification's `data.id`
 * (or, for the older query-string webhook form, the `data.id` query
 * param) — the caller resolves which one applies before calling this.
 */
export function verifyMercadoPagoWebhookSignature(params: {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string;
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing MERCADOPAGO_WEBHOOK_SECRET. Copy .env.example to .env.local and fill it in.");
  }
  if (!params.signatureHeader || !params.requestIdHeader) return false;

  const parts: Record<string, string> = {};
  for (const pair of params.signatureHeader.split(",")) {
    const [key, value] = pair.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.requestIdHeader};ts:${ts};`;
  const expectedHex = createHmac("sha256", secret).update(manifest).digest("hex");

  const expected = Buffer.from(expectedHex, "hex");
  let actual: Buffer;
  try {
    actual = Buffer.from(v1, "hex");
  } catch {
    return false;
  }
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
