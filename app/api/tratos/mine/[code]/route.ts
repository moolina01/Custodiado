import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { toPanelDto } from "@/lib/tratos/dto";
import { getTratoByCode } from "@/lib/tratos/repository";

export const runtime = "nodejs";

/**
 * SPEC 05: backs `/panel/[code]` (the read-only detail screen for a
 * terminal trato). Deliberately stricter than `GET /api/tratos/[code]`:
 * that one (SPEC 04) is open to *any* logged-in session, on purpose — it's
 * how someone opens a code a counterpart shared with them. This one is
 * "my tratos", not a general lookup, so anything that isn't this session's
 * own (neither `buyer_user_id` nor `seller_user_id`) is a 404, same as if
 * it didn't exist.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  try {
    const user = await requireSessionUser();
    const trato = await getTratoByCode(code);
    if (!trato || (trato.buyer_user_id !== user.id && trato.seller_user_id !== user.id)) {
      return jsonError(404, "Trato no encontrado.");
    }
    return jsonOk(toPanelDto(trato, user.id));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al buscar el trato.");
  }
}
