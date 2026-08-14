import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { toPublicDto } from "@/lib/tratos/dto";
import { getTratoByCode } from "@/lib/tratos/repository";

export const runtime = "nodejs";

// Generous enough for legitimate polling (several tabs at once, every ~3s)
// while still making brute-forcing a 6-character code (32^6 combinations)
// wildly impractical — see lib/rateLimit.ts.
const LOOKUP_LIMIT = 120;
const LOOKUP_WINDOW_SECONDS = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const allowed = await checkRateLimit(`lookup:${getClientIp(request)}`, LOOKUP_LIMIT, LOOKUP_WINDOW_SECONDS);
  if (!allowed) return jsonError(429, "Demasiadas solicitudes. Intenta de nuevo en un momento.");

  try {
    // SPEC 04: "toda la app requiere login" — cualquier cuenta logueada
    // puede seguir viendo un trato con solo el código (no restringido a las
    // partes, a diferencia de bank-details/cancel), pero ya no alcanza con
    // el código solo: hace falta sesión.
    await requireSessionUser();

    const trato = await getTratoByCode(code);
    if (!trato) return jsonError(404, "Trato no encontrado. Revisa el código.");
    return jsonOk(toPublicDto(trato));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al buscar el trato.");
  }
}
