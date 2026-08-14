import "server-only";
import { WebhookSignature, WebhookSignatureError } from "fintoc";

export { parseFintocWebhookEvent, extractTransferData, type FintocWebhookEvent, type InboundCounterparty } from "./webhookParsing";

/**
 * Verifies a Fintoc webhook's `Fintoc-Signature` header against
 * `FINTOC_WEBHOOK_SECRET` (from the dashboard) before anything in the
 * payload is trusted. `WebhookSignature.verifyHeader` also enforces a
 * timestamp tolerance window (replay protection) — see
 * `node_modules/fintoc/build/main/lib/webhook.d.ts`.
 */
export function verifyFintocWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.FINTOC_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing FINTOC_WEBHOOK_SECRET. Copy .env.example to .env.local and fill it in.");
  }
  if (!signatureHeader) return false;

  try {
    WebhookSignature.verifyHeader(rawBody, signatureHeader, secret);
    return true;
  } catch (error) {
    if (error instanceof WebhookSignatureError) return false;
    throw error;
  }
}
