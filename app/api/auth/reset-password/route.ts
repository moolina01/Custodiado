import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { createAuthClient } from "@/lib/supabase/authClient";
import { resetPasswordRequestSchema } from "@/lib/profiles/validation";

export const runtime = "nodejs";

/**
 * Pide el link de recuperación. `redirectTo` debe estar en la lista de
 * Redirect URLs permitidas del proyecto de Supabase (Authentication -> URL
 * Configuration) — config de dashboard, no algo que este endpoint controle.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body inválido, se esperaba JSON.");
  }

  const parsed = resetPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos inválidos.", parsed.error.flatten());
  }

  try {
    const supabase = await createAuthClient();
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent("/reset-password/confirm")}`,
    });

    // Misma respuesta exista o no la cuenta — no se le confirma a quien
    // pide el reset si ese email está registrado o no.
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al pedir la recuperación.");
  }
}
