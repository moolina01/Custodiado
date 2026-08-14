import { z } from "zod";

/**
 * Pure parsing of Fintoc webhook payloads — deliberately without
 * "server-only" (unlike `verifyFintocWebhookSignature` in `webhooks.ts`,
 * which reads `FINTOC_WEBHOOK_SECRET`) so it can be unit-tested directly,
 * same tradeoff already made in `lib/tratos/qrToken.ts`. Re-exported from
 * `webhooks.ts` for callers — nothing outside this file should import it
 * directly.
 */

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

// SPEC 03: the sender's details on an inbound transfer, as Fintoc reports
// them under `counterparty` (confirmed against docs.fintoc.com/reference/
// transfer-object). Every field is optional — Fintoc doesn't always include
// it (depends on the payment rail), and `matchInboundPayment` treats a
// missing `holder_id` as "nothing to compare", not a mismatch.
const counterpartySchema = z
  .object({
    holder_id: z.string().optional(),
    holder_name: z.string().optional(),
    account_number: z.string().optional(),
    account_type: z.enum(["checking_account", "sight_account"]).optional(),
    institution: z.object({ id: z.string() }).optional(),
  })
  .optional();

export type InboundCounterparty = {
  holderId: string;
  holderName?: string;
  accountNumber?: string;
  accountType?: "checking_account" | "sight_account";
  institutionId?: string;
};

// `event.data` is the transfer resource itself (Fintoc tags it with an
// `object: "transfer"` sibling field rather than nesting it further) — we
// only need `id`, `amount` and (for inbound transfers, SPEC 03) `counterparty`
// off of it to match/resolve a trato.
const transferDataSchema = z.object({ id: z.string(), amount: z.number().optional(), counterparty: counterpartySchema });

export function extractTransferData(data: unknown): { id: string; amount?: number; counterparty?: InboundCounterparty } | null {
  const parsed = transferDataSchema.safeParse(data);
  if (!parsed.success) return null;

  const { counterparty, ...rest } = parsed.data;
  // Without a `holder_id`, there's no RUT to compare against — treat it as
  // "no counterparty reported" rather than a counterparty with an empty RUT.
  if (!counterparty?.holder_id) return rest;

  return {
    ...rest,
    counterparty: {
      holderId: counterparty.holder_id,
      holderName: counterparty.holder_name,
      accountNumber: counterparty.account_number,
      accountType: counterparty.account_type,
      institutionId: counterparty.institution?.id,
    },
  };
}
