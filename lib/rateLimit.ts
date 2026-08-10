import "server-only";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const TABLE = "rate_limit_hits";

/**
 * Fixed-window rate limiter backed by `rate_limit_hits` (see
 * `supabase/migrations/0002_rate_limits.sql` for why Postgres instead of an
 * in-memory counter). Approximate under concurrent bursts — see that
 * migration's comment — which is an acceptable tradeoff for deterring
 * brute-force enumeration of trato codes, not a billing-grade guarantee.
 *
 * @returns true if the request is allowed, false if it should be rejected (429).
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = getSupabaseAdmin();
  const bucketMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / bucketMs) * bucketMs).toISOString();

  const { data: existing, error: readError } = await db
    .from(TABLE)
    .select("count")
    .eq("bucket_key", key)
    .eq("window_start", windowStart)
    .maybeSingle();

  // Fail open: if the rate-limit table itself is unreachable, don't take
  // the whole app down over it — just let the request through.
  if (readError) return true;

  const currentCount = existing?.count ?? 0;
  if (currentCount >= limit) return false;

  await db.from(TABLE).upsert({ bucket_key: key, window_start: windowStart, count: currentCount + 1 }, { onConflict: "bucket_key,window_start" });
  return true;
}

/** Best-effort client IP for rate-limit keys. Trusts `x-forwarded-for` (set by Vercel/most proxies) since there's no lower-level access to the socket in a Route Handler. */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
