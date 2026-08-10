import { NextResponse, type NextRequest } from "next/server";
import { extractTransferData, parseFintocWebhookEvent, verifyFintocWebhookSignature, type FintocWebhookEvent } from "@/lib/fintoc/webhooks";
import { matchInboundPayment, resolveOutboundTransfer } from "@/lib/tratos/repository";
import { hasProcessedWebhookEvent, recordWebhookEvent } from "@/lib/tratos/webhookEvents";

export const runtime = "nodejs";

/**
 * Fintoc's own server calls this — never fetched from our client code.
 * Every event is signature-verified before anything in it is trusted (see
 * `lib/fintoc/webhooks.ts`), and deduped via `fintoc_webhook_events` since
 * Fintoc retries on any non-2xx response.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("fintoc-signature");

  let signatureValid: boolean;
  try {
    signatureValid = verifyFintocWebhookSignature(rawBody, signatureHeader);
  } catch (error) {
    // Missing FINTOC_WEBHOOK_SECRET etc. — our config problem, not a hostile request.
    console.error("[fintoc webhook] configuration error:", error);
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = parseFintocWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  if (await hasProcessedWebhookEvent(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let matchedTratoId: string | null = null;
  try {
    matchedTratoId = await handleEvent(event);
  } catch (error) {
    console.error(`[fintoc webhook] failed to process ${event.type} (${event.id}):`, error);
    // Record it anyway so it's visible for reconciliation, but return 500 so Fintoc retries delivery.
    await recordWebhookEvent({ id: event.id, type: event.type, payload: event, matchedTratoId });
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  await recordWebhookEvent({ id: event.id, type: event.type, payload: event, matchedTratoId });
  return NextResponse.json({ received: true });
}

/** Returns the id of whatever trato this event affected, or null if none did. */
async function handleEvent(event: FintocWebhookEvent): Promise<string | null> {
  switch (event.type) {
    case "transfer.inbound.succeeded": {
      const transfer = extractTransferData(event.data);
      if (!transfer || typeof transfer.amount !== "number") return null;
      const result = await matchInboundPayment(transfer.id, transfer.amount);
      return result.outcome === "no_match" ? null : result.trato.id;
    }

    case "transfer.outbound.succeeded":
    case "transfer.outbound.returned":
    case "transfer.outbound.failed": {
      const transfer = extractTransferData(event.data);
      if (!transfer) return null;
      const outcome = event.type === "transfer.outbound.succeeded" ? "succeeded" : event.type === "transfer.outbound.returned" ? "returned" : "failed";
      const trato = await resolveOutboundTransfer(transfer.id, outcome);
      return trato?.id ?? null;
    }

    default:
      return null; // an event type we don't act on — acknowledge and move on
  }
}
