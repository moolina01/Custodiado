import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { ForbiddenError, requireAdminUser } from "@/lib/auth/admin";
import { toSoporteTicketDto } from "@/lib/soporte/dto";
import { listTicketsAdmin } from "@/lib/soporte/repository";
import type { SoporteEstado } from "@/lib/soporte/types";

export const runtime = "nodejs";

const VALID_ESTADOS: SoporteEstado[] = ["auto_resuelto", "pendiente", "respondido"];

/** Cola de consultas — backs `/admin/soporte`. `?estado=pendiente` filtra, por defecto trae todo. */
export async function GET(request: NextRequest) {
  const estadoParam = request.nextUrl.searchParams.get("estado");
  if (estadoParam && !VALID_ESTADOS.includes(estadoParam as SoporteEstado)) {
    return jsonError(400, "Estado inválido.");
  }

  try {
    await requireAdminUser();
    const tickets = await listTicketsAdmin(estadoParam as SoporteEstado | undefined);
    return jsonOk(tickets.map(toSoporteTicketDto));
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudieron listar las consultas.");
  }
}
