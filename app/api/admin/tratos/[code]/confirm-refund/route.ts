import { jsonError, jsonOk } from "@/lib/http";
import { ForbiddenError, requireAdminUser } from "@/lib/auth/admin";
import { notifyRefundCompleted } from "@/lib/email/cancellationNotifications";
import { toAdminDto } from "@/lib/tratos/dto";
import { markRefundedManually } from "@/lib/tratos/repository";

export const runtime = "nodejs";

/**
 * The admin's manual fallback confirmation — used only when Mercado Pago's
 * automatic refund (lib/tratos/cancel.ts) didn't resolve to `refunded`
 * within the same request and the webhook didn't arrive either. The admin
 * verifies it in the Mercado Pago dashboard first, then confirms here.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  try {
    await requireAdminUser();
    const result = await markRefundedManually(code);

    switch (result.outcome) {
      case "not_found":
        return jsonError(404, "Trato no encontrado.");
      case "wrong_status":
        return jsonError(409, "Este trato no está esperando confirmación de reembolso.");
      case "refunded":
        await notifyRefundCompleted(result.trato);
        return jsonOk(toAdminDto(result.trato));
    }
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo confirmar el reembolso.");
  }
}
