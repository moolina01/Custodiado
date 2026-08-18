import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { toPanelDto } from "@/lib/tratos/dto";
import { getTratosForUser } from "@/lib/tratos/repository";

export const runtime = "nodejs";

// SPEC 05: backs `/panel` — every trato where the session is either side,
// newest first. `requireSessionUser()` here is belt-and-suspenders under
// `proxy.ts`'s matcher (same reasoning as the rest of `/api/tratos*`), and
// this route needs no extra rate limiting: unlike GET /api/tratos/[code]
// (a guessable 6-char code, protected against brute-forcing), this one
// takes no client-supplied lookup key at all — only the session decides
// what comes back.
export async function GET() {
  try {
    const user = await requireSessionUser();
    const tratos = await getTratosForUser(user.id);
    return jsonOk(tratos.map((row) => toPanelDto(row, user.id)));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al listar tus tratos.");
  }
}
