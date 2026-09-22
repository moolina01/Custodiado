import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { TratoRow } from "@/lib/tratos/types";

/**
 * `TratoRow` has no email columns — only `buyer_user_id`/`seller_user_id`
 * (Supabase auth user ids). This is the only place that resolves either
 * side's actual email, via the service-role auth admin API (same client
 * lib/tratos/repository.ts already uses to bypass RLS).
 */
async function resolveUserEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
  if (error) {
    console.error(`[email] failed to resolve email for user ${userId}:`, error);
    return null;
  }
  return data.user?.email ?? null;
}

/**
 * Either side's email for a given trato, or `null` when that side hasn't
 * joined yet (e.g. cancelling while `awaiting_acceptance`, before the
 * counterparty has a `*_user_id` at all) — callers must tolerate a `null`
 * and simply skip notifying that side, not treat it as an error.
 */
export async function resolveTratoPartyEmails(trato: TratoRow): Promise<{ buyer: string | null; seller: string | null }> {
  const [buyer, seller] = await Promise.all([resolveUserEmail(trato.buyer_user_id), resolveUserEmail(trato.seller_user_id)]);
  return { buyer, seller };
}
