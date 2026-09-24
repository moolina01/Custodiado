import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { SoporteTicketRow } from "@/lib/soporte/types";
import { sendEmail } from "./resend";

/**
 * Fires after the admin answers a pending ticket
 * (`app/api/admin/soporte/[id]/responder/route.ts`). Best-effort, same
 * pattern as `lib/email/adminNotifications.ts`'s `sendAdminEmail` — a send
 * failure here shouldn't undo the reply, which already saved correctly.
 */
export async function notifyUserSoporteAnswered(userId: string, ticket: SoporteTicketRow): Promise<void> {
  try {
    const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    if (error || !data.user?.email) {
      if (error) console.error(`[email] failed to resolve email for user ${userId}:`, error);
      return;
    }

    await sendEmail({
      to: data.user.email,
      subject: "Respondimos tu consulta",
      text: [`Tu pregunta: ${ticket.pregunta}`, ``, `Nuestra respuesta: ${ticket.respuesta}`].join("\n"),
    });
  } catch (error) {
    console.error(`[email] failed to notify user ${userId} of soporte reply:`, error);
  }
}
