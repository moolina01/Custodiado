import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { cleanRut } from "@/lib/rut";
import type { ProfileRow } from "./types";

const TABLE = "profiles";
const POSTGRES_UNIQUE_VIOLATION = "23505";

export type CreateProfileResult = { outcome: "created"; profile: ProfileRow } | { outcome: "rut_taken" };

/**
 * Creates the profile row for a freshly-registered auth user — called right
 * after `supabase.auth.signUp` succeeds (see `app/api/auth/signup/route.ts`).
 * The RUT is normalized before insert so the unique index in
 * `0005_add_profiles.sql` actually enforces "one account per identity",
 * not just "one account per exact string".
 *
 * If this returns `"rut_taken"`, the caller is expected to delete the
 * auth user it just created rather than leave a session with no profile
 * behind it — see the signup route for that cleanup.
 */
export async function createProfile(userId: string, name: string, rut: string): Promise<CreateProfileResult> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(TABLE)
    .insert({ id: userId, name, rut: cleanRut(rut) })
    .select()
    .single();

  if (!error) return { outcome: "created", profile: data as ProfileRow };
  if (error.code === POSTGRES_UNIQUE_VIOLATION) return { outcome: "rut_taken" };
  throw new Error(`No se pudo crear el perfil: ${error.message}`);
}

/** Reads the profile for a signed-in account — the source of truth for the name/RUT a trato records at create/accept time (SPEC 04). */
export async function getProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(TABLE).select().eq("id", userId).maybeSingle();
  if (error) throw new Error(`No se pudo leer el perfil: ${error.message}`);
  return (data as ProfileRow | null) ?? null;
}
