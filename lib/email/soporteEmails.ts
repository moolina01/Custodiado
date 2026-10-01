import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { SoporteTicketRow } from "@/lib/soporte/types";
import { requireAppBaseUrl, sendBrandedEmail } from "./send";

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

    await sendBrandedEmail(data.user.email, "Respondimos tu consulta", {
      preheader: (ticket.respuesta ?? "").slice(0, 120),
      tone: "info",
      eyebrow: "Centro de ayuda",
      title: "Respondimos tu consulta",
      intro: "Gracias por escribirnos. Esta es la respuesta a tu pregunta:",
      blocks: [
        { label: "Tu pregunta", body: ticket.pregunta },
        { label: "Nuestra respuesta", body: ticket.respuesta ?? "" },
      ],
      cta: { label: "Ir al centro de ayuda", url: `${requireAppBaseUrl()}/soporte` },
      footnote: "Recibiste este correo porque hiciste una consulta en el centro de ayuda de Custodiado.",
    });
  } catch (error) {
    console.error(`[email] failed to notify user ${userId} of soporte reply:`, error);
  }
}
