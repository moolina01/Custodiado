import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { toSoporteTicketDto } from "@/lib/soporte/dto";
import { askSoporte, listTicketsForUser } from "@/lib/soporte/repository";
import { askSoporteSchema } from "@/lib/soporte/validation";
import { notifyAdminSoporteUnmatched } from "@/lib/email/adminNotifications";

export const runtime = "nodejs";

/** Historial de consultas de la cuenta logueada — backs `/soporte`. */
export async function GET() {
  try {
    const user = await requireSessionUser();
    const tickets = await listTicketsForUser(user.id);
    return jsonOk(tickets.map(toSoporteTicketDto));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo cargar tu historial de soporte.");
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = askSoporteSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos inválidos.", parsed.error.flatten());

  try {
    const user = await requireSessionUser();
    const { matched, ticket } = await askSoporte(user.id, parsed.data.pregunta);
    if (!matched) await notifyAdminSoporteUnmatched(ticket);
    return jsonOk(toSoporteTicketDto(ticket), 201);
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo registrar tu consulta.");
  }
}
