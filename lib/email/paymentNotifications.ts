import "server-only";
import { money } from "@/lib/pricing";
import type { TratoRow } from "@/lib/tratos/types";
import { sendEmail } from "./resend";
import { resolveTratoPartyEmails } from "./partyEmails";

function requireAppBaseUrl(): string {
  const url = process.env.APP_BASE_URL;
  if (!url) throw new Error("Missing APP_BASE_URL. Copy .env.example to .env.local and fill it in.");
  return url;
}

/** Same `/flujo?role=&code=` deep link the panel/ActiveTratoBanner already use to reopen an in-progress trato — see components/panel/PanelView.tsx. */
function tratoLinkFor(code: string, role: "comprador" | "vendedor"): string {
  return `${requireAppBaseUrl()}/flujo?role=${role}&code=${code}`;
}

/** Same best-effort, one-recipient-at-a-time shape as lib/email/cancellationNotifications.ts's `sendBestEffort` — one side's email failing shouldn't stop the other's from going out. */
async function sendBestEffort(to: string, subject: string, text: string): Promise<void> {
  try {
    await sendEmail({ to, subject, text });
  } catch (error) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, error);
  }
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
  const header = [`Trato ${trato.code} — ${trato.item}`, `Monto: ${money(trato.amount_clp)}`].join("\n");

  if (sellerEmail) {
    await sendBestEffort(
      sellerEmail,
      `Pago protegido — ya puedes coordinar la entrega`,
      [
        `¡Buenas noticias! ${trato.buyer_name ?? "El comprador"} ya pagó y la plata quedó retenida en custodia.`,
        ``,
        header,
        ``,
        `Ya puedes coordinar la entrega con tranquilidad — recuerda no entregar nada hasta ver este aviso.`,
        ``,
        tratoLinkFor(trato.code, "vendedor"),
      ].join("\n")
    );
  } else {
    console.error(`[email] no email on file for the vendedor side of trato ${trato.code} — funds-held notice not delivered.`);
  }

  if (buyerEmail) {
    await sendBestEffort(
      buyerEmail,
      `Tu pago del trato ${trato.code} quedó protegido`,
      [
        `Confirmamos tu pago — la plata queda retenida en custodia hasta que confirmes la entrega.`,
        ``,
        header,
        ``,
        `${trato.seller_name ?? "El vendedor"} ya puede coordinar contigo la entrega.`,
        ``,
        tratoLinkFor(trato.code, "comprador"),
      ].join("\n")
    );
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
  const header = [`Trato ${trato.code} — ${trato.item}`, `Monto: ${money(trato.amount_clp)}`].join("\n");

  if (sellerEmail) {
    await sendBestEffort(
      sellerEmail,
      `Trato hecho — tu pago está en camino`,
      [
        `¡Trato hecho! ${trato.buyer_name ?? "El comprador"} confirmó que recibió el producto.`,
        ``,
        header,
        ``,
        `Te transferimos el pago a tu cuenta en un plazo máximo de 12 horas.`,
        ``,
        tratoLinkFor(trato.code, "vendedor"),
      ].join("\n")
    );
  } else {
    console.error(`[email] no email on file for the vendedor side of trato ${trato.code} — release-started notice not delivered.`);
  }

  if (buyerEmail) {
    await sendBestEffort(
      buyerEmail,
      `Trato hecho — liberamos el pago`,
      [
        `¡Trato hecho! Confirmaste que recibiste el producto y liberamos el pago.`,
        ``,
        header,
        ``,
        `${trato.seller_name ?? "El vendedor"} recibe la plata en su cuenta en un plazo máximo de 12 horas.`,
        ``,
        tratoLinkFor(trato.code, "comprador"),
      ].join("\n")
    );
  }
}
