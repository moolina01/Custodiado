import "server-only";
import { money } from "@/lib/pricing";
import { formatTratoCodeForDisplay } from "@/lib/codeFormat";
import type { CreatedByRole, TratoRow } from "@/lib/tratos/types";
import { resolveTratoPartyEmails } from "./partyEmails";
import { requireAppBaseUrl, sendBrandedEmail, sendBrandedEmailToAdmins } from "./send";

function adminLinkFor(code: string): string {
  return `${requireAppBaseUrl()}/admin/tratos/${code}`;
}

function detailLinkFor(code: string): string {
  return `${requireAppBaseUrl()}/panel/${code}`;
}

const ROLE_LABEL: Record<CreatedByRole, string> = { comprador: "El comprador", vendedor: "El vendedor" };
const OTHER_ROLE: Record<CreatedByRole, CreatedByRole> = { comprador: "vendedor", vendedor: "comprador" };

function footnoteFor(trato: TratoRow): string {
  return `Recibiste este correo porque participas en el trato ${formatTratoCodeForDisplay(trato.code)}.`;
}

/**
 * The immediate notification — fires as soon as a cancellation is recorded
 * (lib/tratos/cancel.ts), before Mercado Pago is ever called for the
 * `funds_held` case, so the counterparty hears it from us before they could
 * notice the refund landing on their own. Content varies by who cancelled
 * and by whether a refund is actually involved. Each recipient is sent
 * separately (see `sendBrandedEmail`), so one failing doesn't stop the rest.
 */
export async function notifyCancellation(trato: TratoRow, cancelledByRole: CreatedByRole): Promise<void> {
  const { buyer: buyerEmail, seller: sellerEmail } = await resolveTratoPartyEmails(trato);
  const cancellerEmail = cancelledByRole === "comprador" ? buyerEmail : sellerEmail;
  const counterpartEmail = cancelledByRole === "comprador" ? sellerEmail : buyerEmail;
  const counterpartRole = OTHER_ROLE[cancelledByRole];
  const hasRefund = trato.status === "refund_pending";
  const code = formatTratoCodeForDisplay(trato.code);
  const details: [string, string][] = [
    ["Producto", trato.item],
    ["Monto", money(trato.amount_clp)],
    ["Motivo", trato.cancel_reason ?? "No se indicó"],
  ];

  if (cancellerEmail) {
    // With a refund involved, the money always goes back to the buyer —
    // "te devolvemos" only reads right when the buyer is the one cancelling.
    const refundIntro =
      cancelledByRole === "comprador"
        ? "Te devolvemos la plata al medio de pago con el que compraste. Te avisamos apenas el reembolso esté listo."
        : "Le devolvemos la plata al comprador. No tienes que hacer nada más de tu lado.";
    await sendBrandedEmail(cancellerEmail, `Cancelaste el trato ${code}`, {
      preheader: hasRefund ? refundIntro : "El trato quedó cerrado, sin montos retenidos.",
      tone: "neutral",
      eyebrow: `Trato ${code}`,
      title: "Cancelaste el trato",
      intro: hasRefund ? refundIntro : "El trato quedó cerrado. No había ningún monto retenido, así que no hay nada que devolver.",
      details,
      cta: { label: "Ver el trato", url: detailLinkFor(trato.code) },
      footnote: footnoteFor(trato),
    });
  }

  if (counterpartEmail) {
    await sendBrandedEmail(counterpartEmail, `${ROLE_LABEL[cancelledByRole]} canceló el trato ${code}`, {
      preheader: `${ROLE_LABEL[cancelledByRole]} canceló el trato por ${trato.item}.`,
      tone: "neutral",
      eyebrow: `Trato ${code}`,
      title: `${ROLE_LABEL[cancelledByRole]} canceló el trato`,
      intro: hasRefund
        ? cancelledByRole === "vendedor"
          ? "Te devolvemos la plata al medio de pago con el que compraste. Te avisamos apenas el reembolso esté listo."
          : "El comprador recibe de vuelta su plata. No tienes que hacer nada más de tu lado."
        : "El trato quedó cerrado. No había ningún monto retenido.",
      details,
      cta: { label: "Ver el trato", url: detailLinkFor(trato.code) },
      footnote: footnoteFor(trato),
    });
  } else {
    console.error(`[email] no email on file for the ${counterpartRole} side of trato ${trato.code} — cancellation notice not delivered.`);
  }

  await sendBrandedEmailToAdmins(`Trato ${trato.code} cancelado`, {
    preheader: `${ROLE_LABEL[cancelledByRole]} canceló el trato ${trato.code}.`,
    tone: hasRefund ? "warning" : "neutral",
    eyebrow: "Aviso interno",
    title: `Trato ${trato.code} cancelado`,
    intro: `${ROLE_LABEL[cancelledByRole]} canceló el trato.`,
    notice: hasRefund
      ? "Quedó en refund_pending. Mercado Pago debería resolverlo solo; si en un rato sigue así, confírmalo a mano desde el panel."
      : undefined,
    details,
    cta: { label: "Ver en el panel de admin", url: adminLinkFor(trato.code) },
    footnote: "Aviso automático para administradores de Custodiado.",
  });
}

/**
 * The second notification — fires once a `funds_held` cancellation's refund
 * actually reaches `refunded`, whether that resolved automatically inside
 * the same request as the cancellation or via the admin's manual fallback
 * confirmation (app/api/admin/tratos/[code]/confirm-refund/route.ts).
 */
export async function notifyRefundCompleted(trato: TratoRow): Promise<void> {
  const { buyer: buyerEmail, seller: sellerEmail } = await resolveTratoPartyEmails(trato);
  const code = formatTratoCodeForDisplay(trato.code);
  const amount = money(trato.amount_clp);

  if (buyerEmail) {
    await sendBrandedEmail(buyerEmail, `Tu reembolso del trato ${code} ya se procesó`, {
      preheader: `Te devolvimos ${amount} al medio de pago con el que compraste.`,
      tone: "success",
      eyebrow: `Trato ${code}`,
      title: "Reembolso completado",
      intro: "Ya te devolvimos la plata al medio de pago con el que compraste. Según tu banco o tarjeta, puede tardar unos días hábiles en verse reflejado.",
      details: [["Producto", trato.item]],
      highlight: { label: "Monto reembolsado", value: amount },
      cta: { label: "Ver el trato", url: detailLinkFor(trato.code) },
      footnote: footnoteFor(trato),
    });
  }
  if (sellerEmail) {
    await sendBrandedEmail(sellerEmail, `Trato ${code} cerrado — reembolso completado`, {
      preheader: "El trato quedó cancelado y el comprador recibió su reembolso.",
      tone: "neutral",
      eyebrow: `Trato ${code}`,
      title: "Trato cerrado",
      intro: "El trato quedó cancelado y ya le devolvimos la plata al comprador. No tienes que hacer nada más.",
      details: [
        ["Producto", trato.item],
        ["Monto reembolsado", amount],
      ],
      cta: { label: "Ver el trato", url: detailLinkFor(trato.code) },
      footnote: footnoteFor(trato),
    });
  }
}
