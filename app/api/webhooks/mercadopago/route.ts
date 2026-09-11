import { NextResponse, type NextRequest } from "next/server";
import { getOrder } from "@/lib/mercadopago/payments";
import { getPayout } from "@/lib/mercadopago/payouts";
import { parseMercadoPagoWebhookEvent, verifyMercadoPagoWebhookSignature, webhookResourceType, type MercadoPagoWebhookEvent } from "@/lib/mercadopago/webhooks";
import { mapPayoutStatusToOutcome, resolveOutboundPayout, resolvePaymentApproved, resolvePaymentRefunded } from "@/lib/tratos/repository";
import { hasProcessedWebhookEvent, recordWebhookEvent } from "@/lib/tratos/webhookEvents";

export const runtime = "nodejs";

/**
 * Mercado Pago's own server calls this — never fetched from our client
 * code. Every event is signature-verified before anything in it is
 * trusted (see `lib/mercadopago/webhooks.ts`), and deduped via
 * `mercadopago_webhook_events` since Mercado Pago, like Fintoc before it,
 * retries on any non-2xx response.
 *
 * Unlike Fintoc's webhooks (which carried the full transfer resource
 * inline), a Mercado Pago notification is just `{ type, data: { id } }` —
 * the actual resource (order or payout) is re-fetched by id below before
 * anything in it is trusted, which also means it always reflects the
 * *current* status, not a snapshot from whenever the notification fired.
 *
 * The order-creation side (`app/api/tratos/[code]/pay/route.ts`) moved
 * from the Payments API to the Orders API (`POST /v1/orders`) — Mercado
 * Pago is discontinuing `/v1/payments` for card checkouts. That changes
 * this webhook's `type` for the buyer's payment from `"payment"` to
 * `"orders"`, and the resource re-fetched from `getPayment` to `getOrder`.
 * The Payouts side (`type: "payout"`) is a separate product and is
 * unaffected by that migration.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const event = parseMercadoPagoWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  let signatureValid: boolean;
  try {
    signatureValid = verifyMercadoPagoWebhookSignature({
      signatureHeader: request.headers.get("x-signature"),
      requestIdHeader: request.headers.get("x-request-id"),
      dataId: String(event.data.id),
    });
  } catch (error) {
    // Missing MERCADOPAGO_WEBHOOK_SECRET etc. — our config problem, not a hostile request.
    console.error("[mercadopago webhook] configuration error:", error);
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  // The notification envelope's own id (dedupe key), falling back to a
  // synthetic one built from the resource it's about — some Mercado Pago
  // webhook configurations (the older query-string form) don't send a
  // top-level `id` at all.
  const eventId = event.id != null ? String(event.id) : `${webhookResourceType(event) ?? "unknown"}:${event.data.id}`;
  const eventType = webhookResourceType(event) ?? "unknown";

  if (await hasProcessedWebhookEvent(eventId)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let matchedTratoId: string | null = null;
  try {
    matchedTratoId = await handleEvent(event);
  } catch (error) {
    console.error(`[mercadopago webhook] failed to process ${eventType} (${eventId}):`, error);
    // Record it anyway so it's visible for reconciliation, but return 500 so Mercado Pago retries delivery.
    await recordWebhookEvent({ id: eventId, type: eventType, payload: event, matchedTratoId });
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  await recordWebhookEvent({ id: eventId, type: eventType, payload: event, matchedTratoId });
  return NextResponse.json({ received: true });
}

/** Returns the id of whatever trato this event affected, or null if none did. */
async function handleEvent(event: MercadoPagoWebhookEvent): Promise<string | null> {
  const resourceType = webhookResourceType(event);
  const dataId = String(event.data.id);

  switch (resourceType) {
    case "orders": {
      const order = await getOrder(dataId);
      const externalReference = order.external_reference;
      if (!externalReference) return null; // not an order we created (or a stale test order) — nothing to match

      if (order.status === "processed") {
        const result = await resolvePaymentApproved(externalReference, order.id);
        return result.outcome === "not_found" ? null : result.trato.id;
      }
      if (order.status === "refunded") {
        const result = await resolvePaymentRefunded(externalReference);
        return result.outcome === "not_found" ? null : result.trato.id;
      }
      return null; // created/action_required/canceled/failed — nothing to advance yet
    }

    case "payout": {
      const payout = await getPayout(dataId);
      const outcome = mapPayoutStatusToOutcome(typeof payout.status === "string" ? payout.status : undefined);
      const trato = await resolveOutboundPayout(dataId, outcome);
      return trato?.id ?? null;
    }

    default:
      return null; // an event type we don't act on — acknowledge and move on
  }
}
