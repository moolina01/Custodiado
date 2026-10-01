import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { formatTratoCodeForDisplay } from "@/lib/codeFormat";
import { getRatingForUser, saveRating, type RatingLookup } from "@/lib/ratings/repository";
import type { RatingResponse } from "@/lib/ratings/types";
import { ratingSchema } from "@/lib/ratings/validation";

export const runtime = "nodejs";

function respond(lookup: RatingLookup) {
  switch (lookup.outcome) {
    case "not_found":
      return jsonError(404, "Trato no encontrado, revisa el link.");
    case "not_party":
      return jsonError(403, "Esta cuenta no participa de este trato.");
    case "not_rateable":
      return jsonError(409, "Este trato todavía no se puede calificar.");
    case "ok": {
      const { trato, role, rating } = lookup;
      const body: RatingResponse = {
        code: formatTratoCodeForDisplay(trato.code),
        item: trato.item,
        role,
        counterpartName: role === "comprador" ? trato.seller_name : trato.buyer_name,
        score: rating?.score ?? null,
        comment: rating?.comment ?? null,
      };
      return jsonOk(body);
    }
  }
}

/** The trato being rated plus this account's rating so far (if any) — backs `/calificar/[code]`. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const user = await requireSessionUser();
    return respond(await getRatingForUser(code, user.id));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo cargar la calificación.");
  }
}

/** Saves this account's 1–5 rating (and optional comment) of how the trato went. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = ratingSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Datos inválidos.", parsed.error.flatten());

  try {
    const user = await requireSessionUser();
    return respond(await saveRating(code, user.id, parsed.data));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo guardar la calificación.");
  }
}
