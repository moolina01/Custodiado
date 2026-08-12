import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { toCreateOrAcceptResponse } from "@/lib/tratos/dto";
import { acceptTrato } from "@/lib/tratos/repository";
import { acceptTratoSchema } from "@/lib/tratos/validation";

export const runtime = "nodejs";

// Accepting is a rare, one-shot action per trato (idempotent retries aside)
// — much lower volume than lookups, so a tighter limit is fine here.
const ACCEPT_LIMIT = 20;
const ACCEPT_WINDOW_SECONDS = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const allowed = await checkRateLimit(`accept:${getClientIp(request)}`, ACCEPT_LIMIT, ACCEPT_WINDOW_SECONDS);
  if (!allowed) return jsonError(429, "Demasiadas solicitudes. Intenta de nuevo en un momento.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = acceptTratoSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    const result = await acceptTrato(code, parsed.data.role, parsed.data.name);

    switch (result.outcome) {
      case "not_found":
        return jsonError(404, "Trato no encontrado. Revisa el código.");
      case "wrong_role":
        return jsonError(
          400,
          parsed.data.role === "comprador"
            ? "Este trato ya lo creaste vos como comprador. Compartí el código con el vendedor."
            : "Este trato ya lo creaste vos como vendedor. Compartí el código con el comprador."
        );
      case "accepted":
      case "already_accepted":
        return jsonOk(toCreateOrAcceptResponse(result.trato, parsed.data.role));
    }
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al aceptar el trato.");
  }
}
