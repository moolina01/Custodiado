import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { ForbiddenError, requireAdminUser } from "@/lib/auth/admin";
import { toSoporteTicketDto } from "@/lib/soporte/dto";
import { answerTicket } from "@/lib/soporte/repository";
import { answerTicketSchema } from "@/lib/soporte/validation";
import { notifyUserSoporteAnswered } from "@/lib/email/soporteEmails";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = answerTicketSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos inválidos.", parsed.error.flatten());

  try {
    await requireAdminUser();
    const result = await answerTicket(id, parsed.data.respuesta, {
      guardarComoFaq: parsed.data.guardarComoFaq,
      keywords: parsed.data.keywords,
    });

    switch (result.outcome) {
      case "not_found":
        return jsonError(404, "Consulta no encontrada.");
      case "already_answered":
        return jsonOk(toSoporteTicketDto(result.ticket));
      case "responded":
        await notifyUserSoporteAnswered(result.ticket.user_id, result.ticket);
        return jsonOk(toSoporteTicketDto(result.ticket));
    }
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo responder la consulta.");
  }
}
