import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { ForbiddenError, requireAdminUser } from "@/lib/auth/admin";
import { toFaqEntryDto } from "@/lib/soporte/dto";
import { deleteFaqEntry, updateFaqEntry } from "@/lib/soporte/repository";
import { updateFaqEntrySchema } from "@/lib/soporte/validation";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = updateFaqEntrySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos inválidos.", parsed.error.flatten());

  try {
    await requireAdminUser();
    const faq = await updateFaqEntry(id, parsed.data);
    if (!faq) return jsonError(404, "Pregunta frecuente no encontrada.");
    return jsonOk(toFaqEntryDto(faq));
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo actualizar la pregunta frecuente.");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireAdminUser();
    await deleteFaqEntry(id);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo borrar la pregunta frecuente.");
  }
}
