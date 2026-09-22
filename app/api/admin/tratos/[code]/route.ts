import { jsonError, jsonOk } from "@/lib/http";
import { ForbiddenError, requireAdminUser } from "@/lib/auth/admin";
import { toAdminDto } from "@/lib/tratos/dto";
import { getTratoByCode } from "@/lib/tratos/repository";

export const runtime = "nodejs";

/** Full detail for one trato — the only route that returns the seller's bank destination. Backs /admin/tratos/[code]. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  try {
    await requireAdminUser();
    const trato = await getTratoByCode(code);
    if (!trato) return jsonError(404, "Trato no encontrado.");
    return jsonOk(toAdminDto(trato));
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo cargar el trato.");
  }
}
