import { jsonError, jsonOk } from "@/lib/http";
import { ForbiddenError, requireAdminUser } from "@/lib/auth/admin";
import { toAdminDto } from "@/lib/tratos/dto";
import { markReleasedManually } from "@/lib/tratos/repository";

export const runtime = "nodejs";

/** The admin's "ya transferí" action, after paying the seller by hand outside the app. */
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  try {
    await requireAdminUser();
    const result = await markReleasedManually(code);

    switch (result.outcome) {
      case "not_found":
        return jsonError(404, "Trato no encontrado.");
      case "wrong_status":
        return jsonError(409, "Este trato no está esperando un pago manual.");
      case "released":
        return jsonOk(toAdminDto(result.trato));
    }
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo marcar el trato como pagado.");
  }
}
