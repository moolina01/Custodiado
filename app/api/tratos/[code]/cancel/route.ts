import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { toPublicDto } from "@/lib/tratos/dto";
import { cancelTrato } from "@/lib/tratos/cancel";
import { cancelTratoSchema } from "@/lib/tratos/validation";

export const runtime = "nodejs";

/** The buyer's cancel/refund. Body carries where to send the money back — collected lazily, only when a cancellation actually happens. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = cancelTratoSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    // SPEC 04: reemplaza el chequeo de RUT (SPEC 03) — la sesión activa
    // debe ser la cuenta dueña del lado "comprador" de este trato.
    const user = await requireSessionUser();
    const { reason, ...destination } = parsed.data;
    const result = await cancelTrato(code, { ...destination, reason }, user.id);

    switch (result.outcome) {
      case "not_found":
        return jsonError(404, "Trato no encontrado. Revisa el código.");
      case "wrong_status":
        return jsonError(409, "Este trato ya no se puede cancelar.");
      case "not_owner":
        return jsonError(403, "Esta cuenta no es la que aceptó este trato como comprador.");
      case "already_refunded":
      case "submitted":
        return jsonOk(toPublicDto(result.trato));
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo cancelar el trato.");
  }
}
