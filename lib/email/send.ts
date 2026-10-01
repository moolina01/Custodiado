import "server-only";
import { renderBrandedEmail, renderBrandedText, type BrandedEmail } from "./brandedTemplate";
import { getAdminEmails, sendEmail } from "./resend";

export function requireAppBaseUrl(): string {
  const url = process.env.APP_BASE_URL;
  if (!url) throw new Error("Missing APP_BASE_URL. Copy .env.example to .env.local and fill it in.");
  return url.replace(/\/+$/, "");
}

/** Everything `BrandedEmail` needs except `baseUrl`, which is always `APP_BASE_URL`. */
export type BrandedContent = Omit<BrandedEmail, "baseUrl">;

/**
 * Sends one branded email (HTML + its generated plain-text twin, see
 * ./brandedTemplate). Best-effort: a failure is logged, never thrown —
 * every caller is a side effect of a trato/ticket change that already
 * saved correctly, and one recipient failing mustn't stop the next one
 * (a cancellation alone notifies up to three).
 */
export async function sendBrandedEmail(to: string | string[], subject: string, content: BrandedContent): Promise<void> {
  try {
    const email: BrandedEmail = { ...content, baseUrl: requireAppBaseUrl() };
    await sendEmail({ to, subject, text: renderBrandedText(email), html: renderBrandedEmail(email) });
  } catch (error) {
    console.error(`[email] failed to send "${subject}" to ${JSON.stringify(to)}:`, error);
  }
}

/**
 * Same, addressed to the admins (`ADMIN_EMAILS`). The list is resolved
 * inside the try on purpose — a missing env var must not break the
 * cancellation/release/dispute request that triggered the notice.
 */
export async function sendBrandedEmailToAdmins(subject: string, content: BrandedContent): Promise<void> {
  let admins: string[];
  try {
    admins = getAdminEmails();
  } catch (error) {
    console.error(`[email] failed to send "${subject}":`, error);
    return;
  }
  await sendBrandedEmail(admins, subject, content);
}
