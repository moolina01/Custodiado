import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * SPEC 04: per-request Supabase Auth client — uses the anon key (respects
 * RLS, can only ever act as whoever's session cookie it's given) and reads/
 * writes that session via `next/headers`' `cookies()`. This is what
 * actually runs `signUp`/`signInWithPassword`/`signOut`/
 * `resetPasswordForEmail` in `app/api/auth/*` and `app/auth/callback`.
 *
 * Deliberately separate from `lib/supabase/server.ts`'s admin client
 * (service-role, `persistSession: false`, no cookies, bypasses RLS) — that
 * one is for reading/writing `tratos`/`profiles` once a caller is already
 * known to be who they say they are; this one is what establishes that in
 * the first place. Neither is ever imported from a Client Component — the
 * `server-only` import throws a build error if that happens, same guard
 * `server.ts` already relies on.
 *
 * Not usable from `proxy.ts`: `next/headers`' `cookies()` only works inside
 * Route Handlers/Server Functions/Server Components, not Proxy — Proxy
 * builds its own client directly against `NextRequest`/`NextResponse`
 * cookies (see `proxy.ts`).
 */
export async function createAuthClient() {
  const cookieStore = await cookies();

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in " +
        "(Project Settings -> API -> anon/publishable key — the service_role secret won't work here, it's a different key on purpose)."
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        // Route Handlers can write cookies; this throws if ever called from
        // a place that can't (e.g. a Server Component render) — that's the
        // correct failure, not something to swallow silently.
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
