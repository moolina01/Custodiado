import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { toPublicDto } from "@/lib/tratos/dto";
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
    const trato = await createTrato(parsed.data);
    return jsonOk(toPublicDto(trato), 201);
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al crear el trato.");
  }
}
