import { jsonError, jsonOk } from "@/lib/http";
import { createAuthClient } from "@/lib/supabase/authClient";
import { getProfileByUserId } from "@/lib/profiles/repository";

export const runtime = "nodejs";

/**
 * SPEC 04 (Google): lo que `/complete-profile` necesita para decidir qué
 * pedir. Si Google ya mandó un nombre (`user_metadata.full_name`/`name`),
 * no se vuelve a pedir — "en ese caso solo pedir el rut" fue el pedido
 * explícito. `hasProfile` le dice a la página que redirija directo a
 * `next` sin mostrar nada si no hay nada que completar (ej. un bookmark
 * viejo de alguien que ya terminó el registro).
 */
export async function GET() {
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return jsonError(401, "No hay sesión activa.");

    const profile = await getProfileByUserId(data.user.id);
    const metadata = data.user.user_metadata as { full_name?: string; name?: string } | undefined;
    const suggestedName = metadata?.full_name ?? metadata?.name ?? null;

    return jsonOk({ email: data.user.email, suggestedName, hasProfile: Boolean(profile) });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado.");
  }
}
