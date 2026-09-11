import { z } from "zod";

/**
 * Pure parsing of Mercado Pago webhook notification envelopes —
 * deliberately without "server-only" (unlike `verifyMercadoPagoWebhookSignature`
 * in `webhooks.ts`, which reads `MERCADOPAGO_WEBHOOK_SECRET`), same tradeoff
 * `lib/fintoc/webhookParsing.ts` made, so it can be unit-tested directly.
 * Re-exported from `webhooks.ts` for callers — nothing outside this file
 * should import it directly.
 *
 * Unlike Fintoc's webhooks (which carried the full resource inline, see
 * the deleted `lib/fintoc/webhookParsing.ts`), a Mercado Pago notification
 * is just an envelope pointing at a resource id — `data.id` — that must be
 * fetched separately (`getPayment`, `getPayout`) before anything in it can
 * be trusted. `type`/`topic` says which kind of resource it is ("payment",
 * "payout", …); `action` ("payment.created"/"payment.updated") is more
 * specific but not always present depending on how the webhook is
 * configured, so nothing here requires it.
 */
const webhookEventSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  topic: z.string().optional(),
  action: z.string().optional(),
  data: z.object({ id: z.union([z.string(), z.number()]) }),
  live_mode: z.boolean().optional(),
});
export type MercadoPagoWebhookEvent = z.infer<typeof webhookEventSchema>;

export function parseMercadoPagoWebhookEvent(rawBody: string): MercadoPagoWebhookEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const parsed = webhookEventSchema.safeParse(json);
  if (!parsed.success) return null;
  return parsed.data;
}

/** The resource kind a notification is about — falls back to `topic` (the older query-string webhook form uses that name instead of `type`). */
export function webhookResourceType(event: MercadoPagoWebhookEvent): string | undefined {
  return event.type ?? event.topic;
}
