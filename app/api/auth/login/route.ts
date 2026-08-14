import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { createAuthClient } from "@/lib/supabase/authClient";
import { loginSchema } from "@/lib/profiles/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    // Mensaje genérico a propósito — no distingue "no existe esa cuenta" de
    // "la contraseña está mal", para no ayudar a adivinar qué emails están
    // registrados.
    if (error || !data.user) return jsonError(401, "Email o contraseña incorrectos.");

    return jsonOk({ id: data.user.id, email: data.user.email });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al iniciar sesión.");
  }
}
