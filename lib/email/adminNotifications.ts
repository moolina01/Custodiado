import "server-only";
import { money } from "@/lib/pricing";
import type { TratoRow } from "@/lib/tratos/types";
import { getAdminEmails, getAdminNotificationFrom, getResendClient } from "./resend";

function requireAppBaseUrl(): string {
  const url = process.env.APP_BASE_URL;
  if (!url) throw new Error("Missing APP_BASE_URL. Copy .env.example to .env.local and fill it in.");
  return url;
}

function adminLinkFor(code: string): string {
  return `${requireAppBaseUrl()}/admin/tratos/${code}`;
}

/**
 * Best-effort: a send failure here shouldn't fail the release/dispute
 * request that triggered it (the trato's own state already changed
 * correctly) — logged instead, same as the rest of this codebase treats
 * side-effects that aren't the primary thing a route is doing.
 */
async function sendAdminEmail(subject: string, text: string): Promise<void> {
  try {
    await getResendClient().emails.send({
      from: getAdminNotificationFrom(),
      to: getAdminEmails(),
      subject,
      text,
    });
  } catch (error) {
    console.error(`[email] failed to send "${subject}":`, error);
  }
}

/**
 * Fires once a trato enters `release_pending` (lib/tratos/release.ts) — the
 * QR was scanned, funds are ready to go out, but Money Out is blocked (see
 * lib/mercadopago/payouts.ts) so this is the only notification that a
 * manual transfer is now owed.
 */
export async function notifyAdminReleaseReady(trato: TratoRow): Promise<void> {
  const deadline = trato.release_deadline_at ? new Date(trato.release_deadline_at).toLocaleString("es-CL") : "—";
  const text = [
    `Trato ${trato.code} listo para pagar al vendedor.`,
    ``,
    `Producto: ${trato.item}`,
    `Monto a transferir: ${money(trato.amount_clp)}`,
    `Vendedor: ${trato.seller_name ?? "—"} (RUT ${trato.seller_rut ?? "—"})`,
    `Banco: ${trato.seller_bank_name ?? "—"}`,
    `Tipo de cuenta: ${trato.seller_account_type ?? "—"}`,
    `Número de cuenta: ${trato.seller_account_number ?? "—"}`,
    ``,
    `Plazo para reclamos: ${deadline}`,
    ``,
    `Ver el trato: ${adminLinkFor(trato.code)}`,
  ].join("\n");

  await sendAdminEmail(`Trato ${trato.code} listo para pagar`, text);
}

/** Fires when either side reports a problem during the 24h window (app/api/tratos/[code]/report-problem/route.ts). */
export async function notifyAdminDisputeReported(trato: TratoRow): Promise<void> {
  const text = [
    `Reclamo en el trato ${trato.code} — no pagues al vendedor todavía.`,
    ``,
    `Reportado por: ${trato.dispute_reported_by ?? "—"}`,
    `Nota: ${trato.dispute_note ?? "(sin nota)"}`,
    ``,
    `Ver el trato: ${adminLinkFor(trato.code)}`,
  ].join("\n");

  await sendAdminEmail(`Reclamo en trato ${trato.code}`, text);
}
