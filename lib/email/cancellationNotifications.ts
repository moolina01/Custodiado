import "server-only";
import { money } from "@/lib/pricing";
import type { CreatedByRole, TratoRow } from "@/lib/tratos/types";
import { getAdminEmails, sendEmail } from "./resend";
import { resolveTratoPartyEmails } from "./partyEmails";

function requireAppBaseUrl(): string {
  const url = process.env.APP_BASE_URL;
  if (!url) throw new Error("Missing APP_BASE_URL. Copy .env.example to .env.local and fill it in.");
  return url;
}

function adminLinkFor(code: string): string {
  return `${requireAppBaseUrl()}/admin/tratos/${code}`;
}

const ROLE_LABEL: Record<CreatedByRole, string> = { comprador: "el comprador", vendedor: "el vendedor" };
const OTHER_ROLE: Record<CreatedByRole, CreatedByRole> = { comprador: "vendedor", vendedor: "comprador" };

/**
 * Best-effort, one try/catch per recipient — unlike
 * lib/email/adminNotifications.ts's `sendAdminEmail`, which sends a single
 * email to a single audience, a cancellation touches up to three different
 * recipients with three different bodies, and one of them failing shouldn't
 * stop the others from going out.
 */
async function sendBestEffort(to: string | string[], subject: string, text: string): Promise<void> {
  try {
    await sendEmail({ to, subject, text });
  } catch (error) {
    console.error(`[email] failed to send "${subject}" to ${JSON.stringify(to)}:`, error);
  }
}

/**
 * The immediate notification — fires as soon as a cancellation is recorded
 * (lib/tratos/cancel.ts), before Mercado Pago is ever called for the
 * `funds_held` case, so the counterparty hears it from us before they could
 * notice the refund landing on their own. Content varies by who cancelled
 * and by whether a refund is actually involved.
 */
export async function notifyCancellation(trato: TratoRow, cancelledByRole: CreatedByRole): Promise<void> {
  const { buyer: buyerEmail, seller: sellerEmail } = await resolveTratoPartyEmails(trato);
  const cancellerEmail = cancelledByRole === "comprador" ? buyerEmail : sellerEmail;
  const counterpartEmail = cancelledByRole === "comprador" ? sellerEmail : buyerEmail;
  const counterpartRole = OTHER_ROLE[cancelledByRole];
  const hasRefund = trato.status === "refund_pending";
  const reasonLine = trato.cancel_reason ? `Motivo: ${trato.cancel_reason}` : "No se indicó un motivo.";
  const header = [`Trato ${trato.code} — ${trato.item}`, `Monto: ${money(trato.amount_clp)}`, reasonLine].join("\n");

  if (cancellerEmail) {
    const nextSteps = hasRefund
      ? "Te devolvemos la plata al medio de pago con el que compraste. Te avisamos apenas esté listo."
      : "El trato queda cerrado, no hay ningún monto retenido.";
    await sendBestEffort(
      cancellerEmail,
      `Cancelaste el trato ${trato.code}`,
      [`Cancelaste este trato.`, ``, header, ``, nextSteps].join("\n")
    );
  }

  if (counterpartEmail) {
    const nextSteps = hasRefund
      ? "El comprador va a recibir de vuelta su plata; no hay nada más que hacer de tu lado."
      : "El trato queda cerrado, no hay ningún monto retenido.";
    await sendBestEffort(
      counterpartEmail,
      `${cancelledByRole === "comprador" ? "El comprador" : "El vendedor"} canceló el trato ${trato.code}`,
      [`${ROLE_LABEL[cancelledByRole]} canceló este trato.`, ``, header, ``, nextSteps].join("\n")
    );
  } else {
    console.error(`[email] no email on file for the ${counterpartRole} side of trato ${trato.code} — cancellation notice not delivered.`);
  }

  const adminNextSteps = hasRefund
    ? "Quedó en refund_pending. Mercado Pago debería resolverlo solo; si en un rato sigue así, confirmalo a mano desde el panel."
    : "No había plata retenida, no requiere ninguna acción.";
  await sendBestEffort(
    getAdminEmails(),
    `Trato ${trato.code} cancelado`,
    [`${ROLE_LABEL[cancelledByRole]} canceló el trato ${trato.code}.`, ``, header, ``, adminNextSteps, ``, `Ver el trato: ${adminLinkFor(trato.code)}`].join("\n")
  );
}

/**
 * The second notification — fires once a `funds_held` cancellation's refund
 * actually reaches `refunded`, whether that resolved automatically inside
 * the same request as the cancellation or via the admin's manual fallback
 * confirmation (app/api/admin/tratos/[code]/confirm-refund/route.ts).
 */
export async function notifyRefundCompleted(trato: TratoRow): Promise<void> {
  const { buyer: buyerEmail, seller: sellerEmail } = await resolveTratoPartyEmails(trato);
  const header = [`Trato ${trato.code} — ${trato.item}`, `Monto reembolsado: ${money(trato.amount_clp)}`].join("\n");

  if (buyerEmail) {
    await sendBestEffort(buyerEmail, `Tu reembolso del trato ${trato.code} ya se procesó`, [`Ya te devolvimos la plata.`, ``, header].join("\n"));
  }
  if (sellerEmail) {
    await sendBestEffort(
      sellerEmail,
      `Trato ${trato.code} cerrado — reembolso completado`,
      [`El trato quedó cancelado y ya le devolvimos la plata al comprador.`, ``, header].join("\n")
    );
  }
}
