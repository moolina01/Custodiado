/**
 * Types mirroring `supabase/migrations/0005_add_profiles.sql`. SPEC 04: one
 * row per Supabase Auth account — `id` is the same uuid as `auth.users.id`,
 * so having a profile row *is* what "finished registering" means here.
 */

/** Shape of a row in the `profiles` table, as returned by supabase-js. */
export interface ProfileRow {
  id: string; // = auth.users.id
  name: string;
  rut: string; // normalized, no dots/dashes — see cleanRut in lib/rut.ts
  created_at: string;
  updated_at: string;
}
