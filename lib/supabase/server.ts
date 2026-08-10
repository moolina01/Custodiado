import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, authenticated with the service-role key so
 * it bypasses RLS. This must never be imported from a Client Component —
 * the `server-only` import throws a build error if that ever happens.
 *
 * Every table has RLS enabled with zero policies (see
 * `supabase/migrations/0001_create_tratos.sql`), so this is deliberately
 * the *only* way anything in this app talks to Supabase. Route Handlers
 * are the enforcement point for who's allowed to read/write a given trato
 * (its short `code` is the bearer credential), not Postgres policies.
 */

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill them in " +
        "(Project Settings -> API -> service_role secret — the publishable/anon key won't work here, RLS denies it by design)."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
