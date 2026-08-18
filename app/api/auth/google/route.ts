import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/authClient";

export const runtime = "nodejs";

/**
 * Arranca el login/registro con Google. Redirect real (no `fetch`) a
 * propósito — "Continuar con Google" (`components/auth/GoogleButton.tsx`)
 * es un `<a>` normal a esta ruta, que arma la URL de consentimiento de
 * Google vía Supabase Auth del lado del servidor y redirige ahí. Mantiene
 * el invariante de "el browser nunca habla directo con Supabase" — ni
 * siquiera para OAuth se usa un cliente Supabase en el cliente.
 *
 * Requiere el proveedor Google habilitado en el dashboard de Supabase
 * (Authentication -> Providers -> Google, con un Client ID/Secret de
 * Google Cloud) — config externa que no se puede hacer por código. Sin
 * eso, `signInWithOAuth` devuelve error y este endpoint manda de vuelta a
 * `/login` con un aviso en vez de romper.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/flujo";

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true, // llamado server-side — este endpoint hace el redirect, no supabase-js
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=google_unavailable`);
  }

  return NextResponse.redirect(data.url);
}
