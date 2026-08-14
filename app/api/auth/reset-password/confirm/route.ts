import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { createAuthClient } from "@/lib/supabase/authClient";
import { resetPasswordConfirmSchema } from "@/lib/profiles/validation";

export const runtime = "nodejs";

/**
 * Fija la nueva contraseña — solo funciona si ya hay una sesión activa
 * establecida por `app/auth/callback/route.ts` al intercambiar el código
 * del link de recuperación. Sin esa sesión, `updateUser` falla.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = resetPasswordConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return jsonError(400, error.message);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al fijar la nueva contraseña.");
  }
}
