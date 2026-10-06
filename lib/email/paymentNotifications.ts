import "server-only";
import { money } from "@/lib/pricing";
import { formatTratoCodeForDisplay } from "@/lib/codeFormat";
import type { TratoRow } from "@/lib/tratos/types";
import { resolveTratoPartyEmails } from "./partyEmails";
import { requireAppBaseUrl, sendBrandedEmail } from "./send";

/** Same `/flujo?role=&code=` deep link the panel uses to reopen an in-progress trato — see components/panel/PanelView.tsx. */
function tratoLinkFor(code: string, role: "comprador" | "vendedor"): string {
  return `${requireAppBaseUrl()}/flujo?role=${role}&code=${code}`;
}

function detailLinkFor(code: string): string {
  return `${requireAppBaseUrl()}/panel/${code}`;
}

/** Where each side rates how the trato went — app/calificar/[code]. */
function ratingLinkFor(code: string): string {
  return `${requireAppBaseUrl()}/calificar/${code}`;
}

function footnoteFor(trato: TratoRow): string {
  return `Recibiste este correo porque participas en el trato ${formatTratoCodeForDisplay(trato.code)}.`;
}

function formatDateTime(iso: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleString("es-CL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
}

/**
 * Fires the moment a trato flips `awaiting_payment -> funds_held` — the
 * seller's cue that they no longer have to sit on the "esperando pago"
 * screen watching for it. Called from both places that can win that
 * transition (`app/api/tratos/[code]/pay/route.ts`'s synchronous response
 * and `app/api/webhooks/mercadopago/route.ts`'s webhook, whichever lands
 * first — see `resolvePaymentApproved`'s own comment), and only when
 * `resolvePaymentApproved` returns `outcome: "matched"`, so a duplicate
 * webhook delivery or the sync/webhook race never double-sends this.
 *
 * Also confirms the payment to the buyer — Checkout API's own confirmation
 * screen doesn't mention Custodiado or what happens next.
 */
export async function notifyFundsHeld(trato: TratoRow): Promise<void> {
  const { buyer: buyerEmail, seller: sellerEmail } = await resolveTratoPartyEmails(trato);
  const code = formatTratoCodeForDisplay(trato.code);
  const amount = money(trato.amount_clp);

  if (sellerEmail) {
    await sendBrandedEmail(sellerEmail, `Pago protegido — ya puedes coordinar la entrega`, {
      preheader: `${trato.buyer_name ?? "El comprador"} pagó ${amount} y la plata quedó en custodia.`,
      tone: "success",
      eyebrow: `Trato ${code}`,
      title: "Pago protegido",
      intro: `${trato.buyer_name ?? "El comprador"} ya pagó y la plata quedó retenida en custodia. Ya puedes coordinar la entrega con tranquilidad.`,
      notice: "No entregues el producto antes de recibir este aviso — y pídele el código de liberación al comprador solo cuando lo tenga en la mano.",
      details: [
        ["Producto", trato.item],
        ["Comprador", trato.buyer_name ?? "—"],
      ],
      highlight: { label: "En custodia", value: amount },
      cta: { label: "Ver el trato", url: tratoLinkFor(trato.code, "vendedor") },
      footnote: footnoteFor(trato),
    });
  } else {
    console.error(`[email] no email on file for the vendedor side of trato ${trato.code} — funds-held notice not delivered.`);
  }

  if (buyerEmail) {
    await sendBrandedEmail(buyerEmail, `Tu pago del trato ${code} quedó protegido`, {
      preheader: `Tu pago de ${amount} quedó retenido en custodia hasta la entrega.`,
      tone: "success",
      eyebrow: `Trato ${code}`,
      title: "Tu pago quedó protegido",
      intro: `Confirmamos tu pago. La plata queda retenida en custodia hasta que tú y ${trato.seller_name ?? "el vendedor"} confirmen la entrega.`,
      notice: "Revisa el producto antes de dar el código de liberación: al darlo, el pago se libera al vendedor y no se puede revertir.",
      details: [
        ["Producto", trato.item],
        ["Vendedor", trato.seller_name ?? "—"],
      ],
      highlight: { label: "En custodia", value: amount },
      cta: { label: "Ver el trato", url: tratoLinkFor(trato.code, "comprador") },
      footnote: footnoteFor(trato),
    });
  }
}

/**
 * Fires the moment `releaseTrato` flips `funds_held -> release_pending` —
 * the QR scan or release code, whichever side confirmed the in-person
 * handoff. Money Out is blocked (see lib/mercadopago/payouts.ts), so an
 * admin still has to move the money by hand — `notifyAdminReleaseReady`
 * (lib/email/adminNotifications.ts) is what actually tells them to — but
 * both sides should hear "trato hecho" right away instead of the seller
 * only finding out once the transfer itself lands.
 */
export async function notifyReleaseStarted(trato: TratoRow): Promise<void> {
  const { buyer: buyerEmail, seller: sellerEmail } = await resolveTratoPartyEmails(trato);
  const code = formatTratoCodeForDisplay(trato.code);
  const amount = money(trato.amount_clp);

  if (sellerEmail) {
    await sendBrandedEmail(sellerEmail, `Trato hecho — tu pago está en camino`, {
      preheader: `Te transferimos ${amount} en un plazo máximo de 12 horas.`,
      tone: "success",
      eyebrow: `Trato ${code}`,
      title: "¡Trato hecho!",
      intro: `${trato.buyer_name ?? "El comprador"} confirmó que recibió el producto. Te transferimos el pago a tu cuenta en un plazo máximo de 12 horas.`,
      details: [
        ["Producto", trato.item],
        ["Comprador", trato.buyer_name ?? "—"],
        ["Cuenta de destino", trato.seller_bank_name ?? "—"],
      ],
      highlight: { label: "A transferir", value: amount },
      cta: { label: "Seguir la transferencia", url: detailLinkFor(trato.code) },
      footnote: footnoteFor(trato),
    });
  } else {
    console.error(`[email] no email on file for the vendedor side of trato ${trato.code} — release-started notice not delivered.`);
  }

  if (buyerEmail) {
    await sendBrandedEmail(buyerEmail, `Trato hecho — liberamos el pago`, {
      preheader: `Liberamos el pago de ${trato.item} al vendedor.`,
      tone: "success",
      eyebrow: `Trato ${code}`,
      title: "¡Trato hecho!",
      intro: `Confirmaste que recibiste el producto y liberamos el pago. ${trato.seller_name ?? "El vendedor"} lo recibe en su cuenta en un plazo máximo de 12 horas.`,
      details: [
        ["Producto", trato.item],
        ["Vendedor", trato.seller_name ?? "—"],
      ],
      highlight: { label: "Pago liberado", value: amount },
      cta: { label: "Ver el trato", url: detailLinkFor(trato.code) },
      footnote: footnoteFor(trato),
    });
  }
}

/**
 * Fires once a trato reaches `released` — the admin confirmed the manual
 * transfer to the seller went through (app/api/admin/tratos/[code]/
 * mark-paid), so the whole thing is actually over for both sides. Unlike
 * `notifyReleaseStarted` ("trato hecho", sent at the handoff), this is the
 * closing note: the seller hears the money is in their account, the buyer
 * that the seller got paid, and both get one-tap stars to rate the
 * experience (app/calificar/[code]).
 */
export async function notifyTratoCompleted(trato: TratoRow): Promise<void> {
  const { buyer: buyerEmail, seller: sellerEmail } = await resolveTratoPartyEmails(trato);
  const code = formatTratoCodeForDisplay(trato.code);
  const amount = money(trato.amount_clp);
  const completedAt = formatDateTime(trato.released_at);
  const ratingUrl = ratingLinkFor(trato.code);

  if (sellerEmail) {
    await sendBrandedEmail(sellerEmail, `Te transferimos ${amount} — trato completado`, {
      preheader: `Transferimos ${amount} a tu cuenta por ${trato.item}.`,
      tone: "success",
      eyebrow: `Trato ${code}`,
      title: "Trato completado",
      intro: `Transferimos ${amount} a tu cuenta${trato.seller_bank_name ? ` en ${trato.seller_bank_name}` : ""}. Según tu banco, puede tardar unos minutos en aparecer. Gracias por vender con Custodiado.`,
      details: [
        ["Producto", trato.item],
        ["Comprador", trato.buyer_name ?? "—"],
        ["Fecha de transferencia", completedAt],
      ],
      highlight: { label: "Transferido a tu cuenta", value: amount },
      cta: { label: "Ver el detalle del trato", url: detailLinkFor(trato.code) },
      rating: { url: ratingUrl },
      footnote: footnoteFor(trato),
    });
  } else {
    console.error(`[email] no email on file for the vendedor side of trato ${trato.code} — completion notice not delivered.`);
  }

  if (buyerEmail) {
    await sendBrandedEmail(buyerEmail, `Trato completado — ${trato.item}`, {
      preheader: `${trato.item}: el vendedor recibió el pago y el trato quedó cerrado.`,
      tone: "success",
      eyebrow: `Trato ${code}`,
      title: "Trato completado",
      intro: `${trato.seller_name ?? "El vendedor"} ya recibió el pago en su cuenta, así que el trato quedó cerrado. Gracias por comprar con Custodiado.`,
      details: [
        ["Producto", trato.item],
        ["Vendedor", trato.seller_name ?? "—"],
        ["Fecha de cierre", completedAt],
      ],
      highlight: { label: "Monto del trato", value: amount },
      cta: { label: "Ver el comprobante", url: detailLinkFor(trato.code) },
      rating: { url: ratingUrl },
      footnote: footnoteFor(trato),
    });
  }
}
