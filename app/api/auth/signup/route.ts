import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { createAuthClient } from "@/lib/supabase/authClient";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createProfile } from "@/lib/profiles/repository";
import { signupSchema } from "@/lib/profiles/validation";

export const runtime = "nodejs";

/**
 * SPEC 04: registro en un solo paso — email, contraseña, nombre y RUT. Sin
 * verificación de email obligatoria: para que `signUp` deje una sesión
 * activa de inmediato (en vez de requerir click en un link antes de poder
 * loguearse), el proyecto de Supabase debe tener "Confirm email" apagado
 * en Authentication -> Providers -> Email. Eso es config del dashboard, no
 * algo que este endpoint pueda forzar por código.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  const { email, password, name, rut } = parsed.data;

  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return jsonError(400, error.message);
    if (!data.user) return jsonError(500, "No se pudo crear la cuenta.");

    const profileResult = await createProfile(data.user.id, name, rut);

    if (profileResult.outcome === "rut_taken") {
      // No dejar una cuenta huérfana sin perfil detrás — se registró el
      // auth.user pero el RUT ya pertenece a otra cuenta, así que se
      // deshace por completo.
      await getSupabaseAdmin().auth.admin.deleteUser(data.user.id);
      return jsonError(400, "Ese RUT ya está asociado a otra cuenta.");
    }

    return jsonOk({ id: data.user.id, email: data.user.email, name: profileResult.profile.name }, 201);
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al registrarte.");
  }
}
