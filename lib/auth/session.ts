import "server-only";
import { createAuthClient } from "@/lib/supabase/authClient";

export type SessionUser = { id: string; email: string | null };

/**
 * Reads the current request's session, if any, via the cookie-scoped auth
 * client (`lib/supabase/authClient.ts`). Returns `null` — never throws —
 * when there's no session; callers decide what "no session" means for them.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/** Thrown by `requireSessionUser` — route handlers catch this and map it to a 401, same shape as any other `lib/tratos` error. */
export class UnauthorizedError extends Error {
  constructor() {
    super("No hay sesión activa.");
  }
}

/**
 * SPEC 04: every `/api/tratos*` route calls this first. `proxy.ts` already
 * redirects unauthenticated browser navigation to `/login` before it gets
 * this far, but a route handler can be hit directly (no proxy pass, a
 * stale client, a stripped cookie) — this is the belt-and-suspenders check
 * that actually enforces it server-side, not just at the edge.
 */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
