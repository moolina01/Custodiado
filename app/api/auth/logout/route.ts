import { jsonError, jsonOk } from "@/lib/http";
import { createAuthClient } from "@/lib/supabase/authClient";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.signOut();
    if (error) return jsonError(500, error.message);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al cerrar sesión.");
  }
}
