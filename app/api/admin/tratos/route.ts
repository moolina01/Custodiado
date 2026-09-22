import { jsonError, jsonOk } from "@/lib/http";
import { ForbiddenError, requireAdminUser } from "@/lib/auth/admin";
import { toAdminDto } from "@/lib/tratos/dto";
import { listTratosAwaitingRefundConfirmation, listTratosAwaitingRelease } from "@/lib/tratos/repository";
import type { TratoRow } from "@/lib/tratos/types";

export const runtime = "nodejs";

function urgencyKey(trato: TratoRow): string {
  return trato.release_deadline_at ?? trato.cancelled_at ?? trato.created_at;
}

/** Every trato waiting on a manual transfer or a refund confirmation — backs /admin. */
export async function GET() {
  try {
    await requireAdminUser();
    const [releasePending, refundPending] = await Promise.all([listTratosAwaitingRelease(), listTratosAwaitingRefundConfirmation()]);
    const tratos = [...releasePending, ...refundPending].sort((a, b) => urgencyKey(a).localeCompare(urgencyKey(b)));
    return jsonOk(tratos.map(toAdminDto));
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudieron listar los tratos.");
  }
}
