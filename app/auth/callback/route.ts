import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/authClient";

export const runtime = "nodejs";

/**
 * Único destino de los links que Supabase Auth manda por email (recuperar
 * contraseña, y a futuro cualquier otro flujo que use un `code`). Intercambia
 * el código por una sesión real (cookies puestas por `createAuthClient`) y
 * redirige a `next` — para el reset de contraseña, `/reset-password/confirm`
 * (ver `app/api/auth/reset-password/route.ts`, que arma ese `next`).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/flujo";

  if (code) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
