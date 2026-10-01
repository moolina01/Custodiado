import "server-only";
import { money } from "@/lib/pricing";
import { accountTypeLabel } from "@/lib/tratos/accountType";
import type { TratoRow } from "@/lib/tratos/types";
import type { SoporteTicketRow } from "@/lib/soporte/types";
import { requireAppBaseUrl, sendBrandedEmailToAdmins } from "./send";

function adminLinkFor(code: string): string {
  return `${requireAppBaseUrl()}/admin/tratos/${code}`;
}

function adminSoporteLink(): string {
  return `${requireAppBaseUrl()}/admin/soporte`;
}

const ADMIN_FOOTNOTE = "Aviso automático para administradores de Custodiado.";

// Every notice below is best-effort (see `sendBrandedEmailToAdmins`): a
// send failure here shouldn't fail the release/dispute request that
// triggered it — the trato's own state already changed correctly.

/**
 * Fires once a trato enters `release_pending` (lib/tratos/release.ts) — the
 * QR was scanned, funds are ready to go out, but Money Out is blocked (see
 * lib/mercadopago/payouts.ts) so this is the only notification that a
 * manual transfer is now owed. Carries everything needed to make the
 * transfer without opening the panel.
 */
export async function notifyAdminReleaseReady(trato: TratoRow): Promise<void> {
  const deadline = trato.release_deadline_at ? new Date(trato.release_deadline_at).toLocaleString("es-CL", { timeZone: "America/Santiago" }) : "—";
  await sendBrandedEmailToAdmins(`Trato ${trato.code} listo para pagar`, {
    preheader: `Transferir ${money(trato.amount_clp)} a ${trato.seller_name ?? "el vendedor"}.`,
    tone: "info",
    eyebrow: "Aviso interno",
    title: `Trato ${trato.code} listo para pagar`,
    intro: `La entrega quedó confirmada. Hay que transferirle al vendedor y después marcar el trato como pagado en el panel.`,
    details: [
      ["Producto", trato.item],
      ["Titular", trato.seller_name ?? "—"],
      ["RUT", trato.seller_rut ?? "—"],
      ["Banco", trato.seller_bank_name ?? "—"],
      ["Tipo de cuenta", accountTypeLabel(trato.seller_account_type)],
      ["Número de cuenta", trato.seller_account_number ?? "—"],
      ["Plazo para reclamos", deadline],
    ],
    highlight: { label: "Monto a transferir", value: money(trato.amount_clp) },
    cta: { label: "Ver en el panel de admin", url: adminLinkFor(trato.code) },
    footnote: ADMIN_FOOTNOTE,
  });
}

/** Fires when either side reports a problem during the 24h window (app/api/tratos/[code]/report-problem/route.ts). */
export async function notifyAdminDisputeReported(trato: TratoRow): Promise<void> {
  await sendBrandedEmailToAdmins(`Reclamo en trato ${trato.code}`, {
    preheader: `Reclamo del ${trato.dispute_reported_by ?? "—"} — no pagues al vendedor todavía.`,
    tone: "danger",
    eyebrow: "Aviso interno",
    title: `Reclamo en el trato ${trato.code}`,
    intro: `Reportado por el ${trato.dispute_reported_by ?? "—"}.`,
    notice: "No le pagues al vendedor todavía.",
    blocks: [{ label: "Nota del reclamo", body: trato.dispute_note ?? "(sin nota)" }],
    details: [
      ["Producto", trato.item],
      ["Monto", money(trato.amount_clp)],
    ],
    cta: { label: "Ver en el panel de admin", url: adminLinkFor(trato.code) },
    footnote: ADMIN_FOOTNOTE,
  });
}

/**
 * Fires when Mercado Pago confirms a payment for a trato that was already
 * cancelled — the buyer's payment sat "en proceso" while the trato expired
 * (lib/tratos/status.ts's `isExpiredPending`) or got cancelled by hand. The
 * money was captured with nothing left to hold it for, so it has to be
 * refunded manually from the Mercado Pago dashboard.
 */
export async function notifyAdminPaymentOnCancelledTrato(trato: TratoRow, orderId: string): Promise<void> {
  await sendBrandedEmailToAdmins(`Pago recibido en trato cancelado ${trato.code}`, {
    preheader: `Mercado Pago confirmó un pago para el trato cancelado ${trato.code}.`,
    tone: "danger",
    eyebrow: "Aviso interno",
    title: "Pago recibido en un trato cancelado",
    intro: `Mercado Pago confirmó un pago para el trato ${trato.code}, que ya estaba cancelado.`,
    notice: "Hay que reembolsarlo a mano desde el dashboard de Mercado Pago.",
    details: [
      ["Orden de Mercado Pago", orderId],
      ["Monto del trato", money(trato.amount_clp)],
      ["Motivo de la cancelación", trato.cancel_reason ?? "(sin motivo)"],
    ],
    cta: { label: "Ver en el panel de admin", url: adminLinkFor(trato.code) },
    footnote: ADMIN_FOOTNOTE,
  });
}

/** Fires when `lib/soporte/repository.ts`'s `askSoporte` finds no matching FAQ — the ticket is `pendiente` and needs a manual reply. */
export async function notifyAdminSoporteUnmatched(ticket: SoporteTicketRow): Promise<void> {
  await sendBrandedEmailToAdmins(`Consulta de soporte sin responder`, {
    preheader: ticket.pregunta.slice(0, 120),
    tone: "info",
    eyebrow: "Aviso interno",
    title: "Nueva consulta de soporte",
    intro: "Llegó una consulta que no matcheó ninguna pregunta frecuente — necesita una respuesta a mano.",
    blocks: [{ label: "Pregunta", body: ticket.pregunta }],
    cta: { label: "Responder", url: adminSoporteLink() },
    footnote: ADMIN_FOOTNOTE,
  });
}
