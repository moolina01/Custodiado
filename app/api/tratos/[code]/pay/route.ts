import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { createCardOrder } from "@/lib/mercadopago/payments";
import { toPublicDto } from "@/lib/tratos/dto";
import { getTratoByCode, resolvePaymentApproved } from "@/lib/tratos/repository";
import { payTratoSchema } from "@/lib/tratos/validation";

export const runtime = "nodejs";

// A genuine retry of the *same* card token (network hiccup, double-tap)
// should reuse the same idempotency key so Mercado Pago treats it as one
// attempt; a real new attempt (the buyer typed a different card) always
// mints a fresh single-use token, so hashing the token in is enough to
// tell the two apart without any server-side attempt-counter.
function paymentIdempotencyKey(tratoId: string, token: string): string {
  return createHash("sha256").update(`${tratoId}:${token}`).digest("hex");
}

// A small, well-known slice of Mercado Pago's `status_detail` vocabulary
// for rejected payments — good enough to point the buyer at what to try
// next; anything else falls back to a generic message rather than showing
// a raw provider code.
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount: "Fondos insuficientes. Probá con otra tarjeta.",
  cc_rejected_bad_filled_card_number: "Revisá el número de la tarjeta.",
  cc_rejected_bad_filled_date: "Revisá la fecha de vencimiento.",
  cc_rejected_bad_filled_security_code: "Revisá el código de seguridad.",
  cc_rejected_call_for_authorize: "Tu banco rechazó el pago. Contactalo o probá con otra tarjeta.",
  cc_rejected_card_disabled: "Esa tarjeta está deshabilitada para pagos online. Probá con otra.",
  cc_rejected_high_risk: "El pago fue rechazado por seguridad. Probá con otra tarjeta.",
};

function rejectionMessage(statusDetail: string | undefined): string {
  return (statusDetail && REJECTION_MESSAGES[statusDetail]) || "El pago fue rechazado. Probá con otra tarjeta.";
}

/** The buyer's Checkout API card payment — charges the trato's own amount, never one the client sends. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = payTratoSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    const user = await requireSessionUser();

    const trato = await getTratoByCode(code);
    if (!trato) return jsonError(404, "Trato no encontrado. Revisa el código.");
    if (trato.buyer_user_id !== user.id) return jsonError(403, "Esta cuenta no es la que aceptó este trato como comprador.");
    if (trato.status !== "awaiting_payment") {
      return jsonError(409, "Este trato no está esperando un pago en este momento.");
    }

    const totalClp = trato.amount_clp + trato.fee_clp;
    const order = await createCardOrder({
      idempotencyKey: paymentIdempotencyKey(trato.id, parsed.data.token),
      token: parsed.data.token,
      totalAmountClp: totalClp,
      installments: parsed.data.installments,
      paymentMethodId: parsed.data.paymentMethodId,
      payerEmail: user.email ?? `${user.id}@custodiado.cl`,
      payerIdentification: { type: parsed.data.identificationType, number: parsed.data.identificationNumber },
      externalReference: trato.code,
      description: `Trato ${trato.code}`,
    });

    // status_detail for a rejection lives on the nested payment, not the order itself.
    const orderPayment = order.transactions?.payments?.[0];

    if (order.status === "processed") {
      const result = await resolvePaymentApproved(trato.code, order.id);
      if (result.outcome === "not_found") return jsonError(404, "Trato no encontrado. Revisa el código.");
      return jsonOk(toPublicDto(result.trato));
    }

    if (order.status === "action_required" || order.status === "created") {
      // action_required: e.g. a 3DS challenge. created: still being processed.
      // The trato stays `awaiting_payment` — the webhook resolves it once
      // Mercado Pago reaches a final status.
      return jsonOk({ ...toPublicDto(trato), paymentStatus: order.status }, 202);
    }

    return jsonError(402, rejectionMessage(orderPayment?.status_detail));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo procesar el pago.");
  }
}
