import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { createProfile } from "@/lib/profiles/repository";
import { completeProfileSchema } from "@/lib/profiles/validation";

export const runtime = "nodejs";

/**
 * SPEC 04 (Google): completa el perfil (nombre + RUT) de una cuenta que ya
 * tiene sesión pero todavía no tiene perfil — el caso de un primer login
 * con Google (Supabase ya creó el `auth.user`, pero Google nunca manda
 * RUT). A diferencia de `/api/auth/signup`, acá NO se borra nada si el RUT
 * está tomado: la cuenta ya es real, así que se deja reintentar con otro
 * RUT en vez de deshacer la sesión (mejor UX que perder una cuenta de
 * Google por un typo).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = completeProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    const user = await requireSessionUser();
    const result = await createProfile(user.id, parsed.data.name, parsed.data.rut);

    if (result.outcome === "rut_taken") {
      return jsonError(400, "Ese RUT ya está asociado a otra cuenta.");
    }

    return jsonOk({ id: user.id, email: user.email, name: result.profile.name });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message);
    return jsonError(500, error instanceof Error ? error.message : "No se pudo completar tu perfil.");
  }
}
