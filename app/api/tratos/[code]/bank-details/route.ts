import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { toPublicDto } from "@/lib/tratos/dto";
import { submitSellerBankDetails } from "@/lib/tratos/repository";
import { bankDetailsSchema } from "@/lib/tratos/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = bankDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    // SPEC 04: reemplaza el chequeo de RUT (SPEC 03) — la sesión activa
    // debe ser la cuenta dueña del lado "vendedor" de este trato.
    const user = await requireSessionUser();
    const result = await submitSellerBankDetails(code, parsed.data, user.id);

    switch (result.outcome) {
      case "not_found":
        return jsonError(404, "Trato no encontrado. Revisa el código.");
      case "wrong_status":
        return jsonError(409, "Ya no se pueden editar los datos bancarios de este trato.");
      case "not_owner":
        return jsonError(403, "Esta cuenta no es la que aceptó este trato como vendedor.");
      case "saved":
        return jsonOk(toPublicDto(result.trato));
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al guardar los datos bancarios.");
  }
}
