import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/authClient";
import { getProfileByUserId } from "@/lib/profiles/repository";

export const runtime = "nodejs";

/**
 * Único destino de los links/redirects que Supabase Auth manda (recuperar
 * contraseña, y el login con Google — `app/api/auth/google/route.ts`).
 * Intercambia el código por una sesión real (cookies puestas por
 * `createAuthClient`) y decide adónde ir después:
 *
 * - Si ya existe un perfil (`profiles`), a `next` directo.
 * - Si no (SPEC 04, Google): a diferencia del registro con email/contraseña
 *   (que crea sesión y perfil en el mismo paso — ver `SignupFields`), un
 *   primer login con Google puede llegar acá con sesión pero sin perfil
 *   todavía, porque Google nunca manda RUT. `/complete-profile` es donde
 *   se pide, una sola vez, antes de seguir a `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/flujo";

  if (code) {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const profile = await getProfileByUserId(data.user.id);
      const destination = profile ? next : `/complete-profile?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
