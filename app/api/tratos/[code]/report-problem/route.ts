import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { notifyAdminDisputeReported } from "@/lib/email/adminNotifications";
import { toPublicDto } from "@/lib/tratos/dto";
import { reportDispute } from "@/lib/tratos/repository";
import { reportProblemSchema } from "@/lib/tratos/validation";

export const runtime = "nodejs";

/** Buyer or seller flags a problem during the 24h manual-release window — see components/panel/TratoDetailView.tsx. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = reportProblemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    const user = await requireSessionUser();
    const result = await reportDispute(code, user.id, parsed.data.note);

    switch (result.outcome) {
      case "not_found":
        return jsonError(404, "Trato no encontrado, revisa el código.");
      case "wrong_status":
        return jsonError(409, "Este trato ya no está en la ventana para reportar un problema.");
      case "not_owner":
        return jsonError(403, "Esta cuenta no participa de este trato.");
      case "already_reported":
        return jsonOk(toPublicDto(result.trato));
      case "reported":
        await notifyAdminDisputeReported(result.trato);
        return jsonOk(toPublicDto(result.trato));
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo reportar el problema.");
  }
}
