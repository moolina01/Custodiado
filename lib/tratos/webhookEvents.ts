import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const TABLE = "mercadopago_webhook_events";

/** Mercado Pago retries webhook deliveries on any non-2xx — this is what makes reprocessing a no-op. */
export async function hasProcessedWebhookEvent(eventId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(TABLE).select("id").eq("id", eventId).maybeSingle();
  if (error) throw new Error(`No se pudo revisar el evento de webhook: ${error.message}`);
  return Boolean(data);
}

export async function recordWebhookEvent(params: { id: string; type: string; payload: unknown; matchedTratoId: string | null }): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from(TABLE).insert({
    id: params.id,
    type: params.type,
    payload: params.payload,
    matched_trato_id: params.matchedTratoId,
  });
  // 23505 = unique violation: two concurrent deliveries of the same event id raced us — harmless, ignore.
  if (error && error.code !== "23505") {
    throw new Error(`No se pudo registrar el evento de webhook: ${error.message}`);
  }
}
