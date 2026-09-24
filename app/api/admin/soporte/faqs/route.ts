import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { ForbiddenError, requireAdminUser } from "@/lib/auth/admin";
import { toFaqEntryDto } from "@/lib/soporte/dto";
import { createFaqEntry, listFaqEntries } from "@/lib/soporte/repository";
import { faqEntrySchema } from "@/lib/soporte/validation";

export const runtime = "nodejs";

/** Catálogo completo de preguntas frecuentes — backs el gestor de FAQ en `/admin/soporte`. */
export async function GET() {
  try {
    await requireAdminUser();
    const faqs = await listFaqEntries();
    return jsonOk(faqs.map(toFaqEntryDto));
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudieron listar las preguntas frecuentes.");
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = faqEntrySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos inválidos.", parsed.error.flatten());

  try {
    await requireAdminUser();
    const faq = await createFaqEntry(parsed.data);
    return jsonOk(toFaqEntryDto(faq), 201);
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo crear la pregunta frecuente.");
  }
}
