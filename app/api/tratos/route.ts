import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { toCreateOrAcceptResponse } from "@/lib/tratos/dto";
import { createTrato } from "@/lib/tratos/repository";
import { createTratoSchema } from "@/lib/tratos/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = createTratoSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    // SPEC 04: refuerzo server-side bajo proxy.ts — name/rut ya no vienen
    // en el body, salen del perfil de esta sesión.
    const user = await requireSessionUser();
    const trato = await createTrato(parsed.data, user.id);
    return jsonOk(toCreateOrAcceptResponse(trato, parsed.data.role), 201);
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al crear el trato.");
  }
}
