import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { toPublicDto } from "@/lib/tratos/dto";
import { verifyReleaseCode } from "@/lib/tratos/releaseCode";
import { releaseTrato } from "@/lib/tratos/release";
import { getTratoByCode } from "@/lib/tratos/repository";
import { verifyReleaseCodeSchema } from "@/lib/tratos/validation";

export const runtime = "nodejs";

// The actual brute-force defense (a 6-digit code only has 1e6
// possibilities, and only ~2 of them are ever valid at once — see
// lib/tratos/releaseCode.ts). Keyed by the trato's own code, not the
// caller's IP, so it can't be sidestepped by spreading attempts across
// different source addresses.
const VERIFY_ATTEMPT_LIMIT = 5;
const VERIFY_ATTEMPT_WINDOW_SECONDS = 300;

/**
 * The code-based alternative to `POST /verify-qr` (see
 * `components/flujo/releaseMethod.ts` for the switch): the seller submits
 * the code the buyer told them in person; only one that verifies
 * (`verifyReleaseCode`) unlocks the same `releaseTrato` every release path
 * runs. Unlike `/verify-qr` (no session check — the scanned QR token was
 * itself the proof), this also checks the caller is logged in as this
 * trato's own seller: the actor submitting the code is the seller here,
 * not the buyer, so that's the identity worth pinning down.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = verifyReleaseCodeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  const allowed = await checkRateLimit(`verify-release-code:${code}`, VERIFY_ATTEMPT_LIMIT, VERIFY_ATTEMPT_WINDOW_SECONDS);
  if (!allowed) return jsonError(429, "Demasiados intentos, esperá unos minutos y pedile el código de nuevo al comprador.");

  try {
    const user = await requireSessionUser();

    const trato = await getTratoByCode(code);
    if (!trato) return jsonError(404, "Trato no encontrado, revisa el código.");
    if (trato.seller_user_id !== user.id) return jsonError(403, "Esta cuenta no es la que aceptó este trato como vendedor.");

    if (!verifyReleaseCode(trato.code, parsed.data.code)) {
      return jsonError(400, "Código inválido o vencido, pedile al comprador que te diga el actual.");
    }

    const result = await releaseTrato(code);

    switch (result.outcome) {
      case "not_found":
        return jsonError(404, "Trato no encontrado, revisa el código.");
      case "missing_bank_details":
        return jsonError(409, "Todavía te faltan tus datos bancarios.");
      case "wrong_status":
        return jsonError(409, "Este trato no está listo para liberar el pago.");
      case "already_released":
      case "submitted":
        return jsonOk(toPublicDto(result.trato));
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    // Logged server-side, same reasoning as verify-qr's catch.
    console.error(`[verify-release-code] releaseTrato(${code}) threw:`, error);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo liberar el pago.");
  }
}
