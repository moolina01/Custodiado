import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// SPEC 04: file convention renamed from `middleware.ts` to `proxy.ts` in
// Next.js 16 — same mechanism (runs on the server before a route renders),
// only the file/export name changed (see node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/proxy.md). The spec calls this
// "middleware.ts"; this is that step, just under the current name.
//
// SPEC 04 (corrección): `/flujo` ya NO está en `config.matcher` — la
// pantalla inicial se ve sin sesión; el gate real vive en el cliente
// (`FlujoApp`, ver `useSession`/`AuthModal`), que muestra "crea tu cuenta"
// a los pocos segundos o apenas el usuario intenta hacer algo, en vez de
// bloquear la carga de la página entera. Lo que sigue gateado acá —de
// verdad, no solo en la UI— es `/api/tratos*`: cualquier intento real de
// crear/aceptar/leer un trato sigue exigiendo sesión del lado del
// servidor, sea cual sea lo que el cliente decida mostrar. `/api/webhooks/
// fintoc` no está en el matcher — Fintoc lo llama directo con su propia
// firma, no con una sesión de usuario.
//
// SPEC 05: `/panel` SÍ está en el matcher, a diferencia de `/flujo` — no
// existe una versión anónima con sentido ("ver mi historial" sin cuenta no
// significa nada), así que acá el gate duro (redirect a `/login`, no un
// modal) vive del lado del servidor. No se resuelve llamando
// `getSessionUser()` desde `app/panel/page.tsx` (un Server Component):
// `supabase.auth.getUser()` puede necesitar rotar el token y reescribir la
// cookie, y `lib/supabase/authClient.ts` tira error a propósito si eso se
// intenta desde un lugar que no puede escribir cookies (ver ese archivo).
// Proxy sí puede escribir cookies — por eso el gate de `/panel` vive acá,
// no en la página.
//
// `next/headers`' `cookies()` (used by `lib/supabase/authClient.ts`) only
// works in Route Handlers/Server Components — not here. Proxy reads/writes
// cookies straight off `NextRequest`/`NextResponse`, so this builds its own
// per-request client instead of reusing that helper.
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY — see .env.example.");
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Also refreshes the session cookie (Supabase rotates the access token) —
  // not just a read, this is why Proxy needs to run on every matched
  // request instead of only on the first one.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // `/api/tratos*`: a `fetch()` from `components/flujo/api.ts`/
    // `components/panel/api.ts` expects JSON back, never an HTML redirect.
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
    }

    // SPEC 05: `/panel*` — real page navigation, so a real redirect,
    // preserving where the visitor was headed (`next`) the same way
    // `/login` already supports for any other entry point.
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // SPEC 05 (ajuste): `/cuenta` (perfil de la cuenta, solo lectura por
  // ahora) es el mismo caso que `/panel` — sin sesión no significa nada,
  // mismo gate duro.
  matcher: ["/api/tratos", "/api/tratos/:path*", "/panel", "/panel/:path*", "/cuenta"],
};
