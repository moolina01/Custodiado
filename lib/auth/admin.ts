import "server-only";
import { getAdminEmails } from "@/lib/email/resend";
import { getSessionUser, type SessionUser } from "./session";

/** Thrown by `requireAdminUser` — route handlers/pages catch this and map it to a 401/403. */
export class ForbiddenError extends Error {
  constructor() {
    super("Esta cuenta no tiene acceso al panel de administración.");
  }
}

/**
 * `proxy.ts` already requires *a* session for everything under `/admin*`
 * and `/api/admin*` (same hard gate as `/panel`) — this is the extra check
 * that it's *the* admin's session, not just any logged-in account.
 * `ADMIN_EMAILS` is the same allowlist `lib/email/resend.ts` sends
 * notifications to, kept as one source of truth.
 */
export async function requireAdminUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user?.email) throw new ForbiddenError();
  if (!getAdminEmails().includes(user.email.toLowerCase())) throw new ForbiddenError();
  return user;
}
