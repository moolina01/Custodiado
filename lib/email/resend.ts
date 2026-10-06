import "server-only";
import { Resend } from "resend";

/**
 * The admin's own Resend account (not a Vercel Marketplace resource — see
 * ADMIN_EMAILS/RESEND_API_KEY in .env.example). Thin wrapper, same
 * `requireEnv` shape as lib/mercadopago/client.ts.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (!client) client = new Resend(requireEnv("RESEND_API_KEY"));
  return client;
}

export function getAdminNotificationFrom(): string {
  return requireEnv("ADMIN_NOTIFICATION_FROM_EMAIL");
}

/** Parses the comma-separated ADMIN_EMAILS env var — also used by lib/auth/admin.ts to check who's allowed into /admin. */
export function getAdminEmails(): string[] {
  return requireEnv("ADMIN_EMAILS")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Generic send, for notifications that aren't admin-only (e.g. buyer/seller
 * cancellation emails — see lib/email/cancellationNotifications.ts). Every
 * app email shares the same `from` address; callers are responsible for
 * catching their own failures the way lib/email/adminNotifications.ts's
 * `sendAdminEmail` does — this doesn't swallow errors itself, since a
 * caller sending to multiple distinct recipients needs one failure not to
 * block the others.
 */
// `html` is optional: most notifications are still plain text; the ones
// built with `renderBrandedEmail` (lib/email/brandedTemplate.ts) send both,
// with `text` as the fallback for clients that don't render HTML.
export async function sendEmail(params: { to: string | string[]; subject: string; text: string; html?: string }): Promise<void> {
  // Resend's SDK reports API failures (unverified domain, bad key, quota…)
  // in the returned `error` instead of throwing — surface them as throws so
  // callers' try/catch actually sees them.
  const { error } = await getResendClient().emails.send({
    from: getAdminNotificationFrom(),
    to: params.to,
    subject: params.subject,
    text: params.text,
    ...(params.html ? { html: params.html } : {}),
  });
  if (error) throw new Error(`Resend ${error.name} (${error.statusCode}): ${error.message}`);
}
