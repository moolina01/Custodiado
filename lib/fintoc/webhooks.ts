import "server-only";
import { z } from "zod";
import { WebhookSignature, WebhookSignatureError } from "fintoc";

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

// Loose envelope shape — every Fintoc event has at least an id and type;
// the `data` payload's exact fields depend on `type` and get validated by
// whichever handler (inbound/outbound) reads it.
const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.unknown().optional(),
  created_at: z.string().optional(),
});
export type FintocWebhookEvent = z.infer<typeof webhookEventSchema>;

export function parseFintocWebhookEvent(rawBody: string): FintocWebhookEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const parsed = webhookEventSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

// `event.data` is the transfer resource itself (Fintoc tags it with an
// `object: "transfer"` sibling field rather than nesting it further) — we
// only need `id` and `amount` off of it to match/resolve a trato.
const transferDataSchema = z.object({ id: z.string(), amount: z.number().optional() });

export function extractTransferData(data: unknown): { id: string; amount?: number } | null {
  const parsed = transferDataSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
